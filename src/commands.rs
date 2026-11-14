use std::collections::HashSet;
use std::env;
use std::path::PathBuf;
use std::process::exit;

use crate::colors::{BOLD, CYAN, DIM, GREEN, MAGENTA, RED, RESET, YELLOW};
use crate::ctx::Ctx;
use crate::graph::{Graph, Package};
use crate::hash::hash_package;
use crate::lock;
use crate::monorepo;
use crate::monorepo::Monorepo;

pub fn build(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    if env::var("INSIDE_BUILDC").unwrap_or_default() == "true" {
        // When inside another buildc command, we don't have to build the active
        // package's dependencies or check if the build is cached, we just need
        // to run the command after --. The process that triggered this build is
        // in charge of building all dependencies and checking the cache.
        if ctx.is_debug {
            println!(
                "{DIM}[buildc] → Ignoring buildc, running command immediately:  {:?}{RESET}",
                ctx.cmd_args
            );
        }
        exec_child_command(
            std::process::Command::new(ctx.cmd_args[0]).args(ctx.cmd_args[1..].iter()),
        );
        return Ok(());
    }

    let monorepo = require_monorepo(ctx);
    let graph = monorepo.to_graph();
    let active_package = require_active_package(ctx, &graph);

    let dependencies = graph
        .get_package_dependencies_build_order(&active_package.name)
        .unwrap();
    let packages_to_build = [dependencies, vec![active_package]].concat();

    build_cached_packages(ctx, &monorepo, packages_to_build);
    Ok(())
}

pub fn deps(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    if env::var("INSIDE_BUILDC").unwrap_or_default() == "true" {
        // When building dependencies inside another buildc command, the parent
        // will already have build the dependencies. So in this case, we return
        // immediately since theres nothing to build.
        return Ok(());
    }

    let monorepo = require_monorepo(ctx);
    let graph = monorepo.to_graph();
    let active_package = require_active_package(ctx, &graph);
    let dependencies = graph
        .get_package_dependencies_build_order(&active_package.name)
        .unwrap();

    build_cached_packages(ctx, &monorepo, dependencies);
    Ok(())
}

pub fn all(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    let monorepo = require_monorepo(ctx);
    let graph = monorepo.to_graph();
    let dependencies = graph.get_overall_build_order();

    build_cached_packages(ctx, &monorepo, dependencies);
    Ok(())
}

pub fn graph(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    let monorepo = require_monorepo(ctx);
    let graph = monorepo.to_graph();
    graph.print()?;
    Ok(())
}

pub fn clean(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monorepo) = monorepo::find() {
        let cache_dir = monorepo.cache_dir();
        if ctx.is_debug {
            println!("{DIM}[buildc] → Deleting cache at {:?}{RESET}", cache_dir);
        }

        match std::fs::remove_dir_all(&cache_dir) {
            Ok(()) => {}
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {}
            Err(err) => return Err(format!("Failed to remove cache: {err}").into()),
        }
    } else {
        if ctx.is_debug {
            println!("{DIM}[buildc] → Not in monorepo{RESET}");
        }
    }

    println!("{GREEN}[buildc] ✓{RESET} Cache deleted");
    Ok(())
}

pub fn prune(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    let monorepo = require_monorepo(ctx);
    let cache_root = monorepo.cache_dir();
    if !cache_root.exists() {
        println!("{GREEN}[buildc] ✓{RESET} Nothing to prune");
        return Ok(());
    }

    let packages = monorepo.to_graph().get_overall_build_order();
    let _lock = lock::acquire(ctx, &cache_root);

    let mut removed: Vec<PathBuf> = vec![];
    let mut package_dirs: HashSet<PathBuf> = HashSet::new();
    for package in &packages {
        let package_cache_dir = cache_root.join(&package.name);
        package_dirs.insert(package_cache_dir.clone());
        if !package_cache_dir.is_dir() {
            continue;
        }

        // Keep the output that's currently restored and the output matching
        // the current source files. Everything else is an older build.
        let source_hash = cache_dir_hash(&get_package_cache_dir(ctx, &monorepo, package));
        let restored_hash =
            std::fs::read_to_string(package_cache_dir.join("current")).unwrap_or_default();
        for entry in std::fs::read_dir(&package_cache_dir)?.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if path.is_dir() && name != source_hash && name != restored_hash {
                removed.push(path);
            }
        }
    }

    // Remove caches of packages that are no longer in the monorepo. Scoped
    // package caches are nested one level deeper, inside "@scope" directories.
    for entry in std::fs::read_dir(&cache_root)?.flatten() {
        let path = entry.path();
        if !path.is_dir() || package_dirs.contains(&path) {
            continue;
        }
        if entry.file_name().to_string_lossy().starts_with('@') {
            for scoped in std::fs::read_dir(&path)?.flatten() {
                if !package_dirs.contains(&scoped.path()) {
                    removed.push(scoped.path());
                }
            }
        } else {
            removed.push(path);
        }
    }

    let mut freed_bytes = 0;
    for path in &removed {
        freed_bytes += fs_extra::dir::get_size(path).unwrap_or(0);
        if ctx.is_debug {
            println!("{DIM}[buildc] → Removing {path:?}{RESET}");
        }
        let result = if path.is_dir() {
            std::fs::remove_dir_all(path)
        } else {
            std::fs::remove_file(path)
        };
        result.unwrap_or_else(|e| println!("Failed to remove {path:?}: {e}"));
    }

    // Clean up "@scope" directories left empty after removing their packages.
    for entry in std::fs::read_dir(&cache_root)?.flatten() {
        if entry.file_name().to_string_lossy().starts_with('@') {
            let _ = std::fs::remove_dir(entry.path());
        }
    }

    println!(
        "{GREEN}[buildc] ✓{RESET} Pruned {} old cache entries {DIM}({:.2} MB freed){RESET}",
        removed.len(),
        freed_bytes as f64 / 1024.0 / 1024.0
    );
    Ok(())
}

/// Find the monorepo the cwd is inside, or exit.
fn require_monorepo(ctx: &Ctx) -> Monorepo {
    let monorepo = monorepo::find();
    if monorepo.is_none() {
        println!(
            "{YELLOW}{BOLD}[buildc] !{RESET} Monorepo root not found. Are you inside a monorepo?"
        );
        exit(1)
    }

    let monorepo = monorepo.unwrap();
    if ctx.is_debug {
        println!(
            "{DIM}[buildc] → Monorepo found at {:?}{RESET}",
            monorepo.root
        );
    }
    monorepo
}

/// Find the package the cwd is inside, or exit.
fn require_active_package(ctx: &Ctx, graph: &Graph) -> Package {
    let active_package = graph.find_active_package();
    if active_package.is_none() {
        eprintln!("{RED}{BOLD}[buildc] !{RESET} Not inside a package directory, could not determine dependencies to build");
        exit(1);
    };
    let active_package = active_package.unwrap();
    if ctx.is_debug {
        println!(
            "{DIM}[buildc] → Active package {:?}{RESET}",
            active_package.dir
        );
    }
    active_package
}

/// Build a list of packages in the order passed in (from 0 to n), restoring each from cache if already built.
/// Exit if something goes wrong.
fn build_cached_packages(ctx: &Ctx, monorepo: &Monorepo, packages: Vec<Package>) {
    if ctx.is_debug {
        println!(
            "{DIM}[buildc] → Packages to build: {:?}{RESET}",
            packages
                .iter()
                .map(|package| &package.name)
                .collect::<Vec<_>>()
        );
    }

    // Only the builds are locked. Callers must not run any other commands
    // while holding the lock, otherwise parallel `buildc deps && <cmd>`
    // processes would wait on each other's commands, not just their builds.
    let _lock = lock::acquire(ctx, &monorepo.cache_dir());
    for package in packages {
        build_cached_package(ctx, monorepo, package);
    }
}

/// Build a single package or restore it from cache if already build.
/// Exit if something goes wrong.
fn build_cached_package(ctx: &Ctx, monorepo: &Monorepo, package: Package) {
    let build_script = package.build_script.clone();
    if package.build_script.is_none() {
        println!(
            "{GREEN}[buildc] ✓{RESET} {}: Nothing to build",
            package.name
        );
        return;
    }
    let build_script = build_script.unwrap();

    let mut args = monorepo.package_manager.run_cmd();
    args.push("build");
    if ctx.is_debug {
        println!(
            "{DIM}[buildc] → Running {args:?} in {:?}{RESET}",
            package.dir.strip_prefix(monorepo.root.clone()).unwrap()
        );
    }

    // Even though we'll actually be calling `<pm> run build`, print the build
    // script instead because it is more meaningful to the user.
    println!(
        "{MAGENTA}[buildc] ◐{RESET} {}: {CYAN}{build_script}{RESET}",
        package.name
    );

    let cache_dir = get_package_cache_dir(ctx, monorepo, &package);
    if ctx.is_debug {
        println!("{DIM}[buildc] → Cache dir: {:?}{RESET}", cache_dir);
    }

    if cache_dir.exists() && package.config.cache {
        // Skip the copy when this exact output is already in place. Besides
        // being faster, re-copying would overwrite files that another
        // process's command (ie: `buildc deps && vitest`) could be reading.
        if is_output_current(&package, &cache_dir) {
            println!("{GREEN}[buildc] ✓{RESET} {}: Up to date!", package.name);
            return;
        }
        restore_package_cache(ctx, &package, &cache_dir);
        mark_output_current(&cache_dir);
        println!("{GREEN}[buildc] ✓{RESET} {}: Cached!", package.name);
        return;
    }

    // The build will change the output, so it no longer matches any hash.
    clear_output_current(&cache_dir);

    exec_in_dir(&package.dir, args);

    if package.config.cache {
        cache_package_output(ctx, &package, &cache_dir);
        mark_output_current(&cache_dir);
    }

    println!("{GREEN}[buildc] ✓{RESET} {}: Built", package.name);
}

/// Return the path to a package's cache based on it's current hash.
fn get_package_cache_dir(ctx: &Ctx, monorepo: &Monorepo, package: &Package) -> PathBuf {
    let (package_hash, file_hashes) = hash_package(package).unwrap_or_else(|e| {
        println!(
            "{RED}{BOLD}[buildc] ✘{RESET} Error computing package hash: {}",
            e
        );
        exit(1)
    });
    if ctx.is_debug {
        println!("{DIM}[buildc] → File hashes:\n{file_hashes}{RESET}");
        println!("{DIM}[buildc] → Package hash: {package_hash}{RESET}");
    }

    monorepo
        .cache_dir()
        .join(package.name.clone())
        .join(package_hash)
}

/// File storing the hash of the output currently in the package's output
/// directory. It lives next to the package's hash directories.
fn current_output_file(cache_dir: &PathBuf) -> PathBuf {
    cache_dir.with_file_name("current")
}

fn cache_dir_hash(cache_dir: &PathBuf) -> String {
    cache_dir
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_default()
}

/// Returns true when the package's output directory already contains the cached output for `cache_dir`.
fn is_output_current(package: &Package, cache_dir: &PathBuf) -> bool {
    let current = std::fs::read_to_string(current_output_file(cache_dir)).ok();
    current.as_deref() == Some(cache_dir_hash(cache_dir).as_str())
        && package.absolute_out_dir().exists()
}

fn mark_output_current(cache_dir: &PathBuf) {
    let _ = std::fs::write(current_output_file(cache_dir), cache_dir_hash(cache_dir));
}

fn clear_output_current(cache_dir: &PathBuf) {
    let _ = std::fs::remove_file(current_output_file(cache_dir));
}

/// Copy the cache output to the package's output directory.
fn restore_package_cache(ctx: &Ctx, package: &Package, cache_dir: &PathBuf) {
    let out_dir = package.absolute_out_dir();
    if ctx.is_debug {
        println!("{DIM}[buildc] → Restoring {cache_dir:?} to {out_dir:?}");
    }
    std::fs::create_dir_all(&out_dir).unwrap();
    let mut copy_options = fs_extra::dir::CopyOptions::default();
    copy_options.overwrite = true;
    copy_options.content_only = true;
    fs_extra::dir::copy(cache_dir, &out_dir, &copy_options).unwrap_or_else(|e| {
        println!("{RED}{BOLD}[buildc] ✘{RESET} Error restoring cache: {}", e);
        exit(1);
    });
}

/// Copy the package's output directory to the cache directory.
fn cache_package_output(ctx: &Ctx, package: &Package, cache_dir: &PathBuf) {
    let out_dir = package.absolute_out_dir();
    if ctx.is_debug {
        println!("{DIM}[buildc] → Caching {out_dir:?} to {cache_dir:?}");
    }

    if !out_dir.exists() {
        println!(
            "{RED}{BOLD}[buildc] ✘{RESET} Output directory {:?} doesn't exist, cannot cache",
            out_dir
        );
        exit(1);
    }

    std::fs::create_dir_all(cache_dir).unwrap();
    let mut copy_options = fs_extra::dir::CopyOptions::default();
    copy_options.overwrite = true;
    copy_options.content_only = true;
    fs_extra::dir::copy(&out_dir, cache_dir, &copy_options).unwrap_or_else(|e| {
        println!("{RED}{BOLD}[buildc] ✘{RESET} Error caching output: {}", e);
        exit(1);
    });
}

/// Execute a command inside a directory. Continue on success, exit if the command failed.
fn exec_in_dir(dir: &PathBuf, args: Vec<&str>) {
    exec_child_command(
        std::process::Command::new(args[0])
            .args(args[1..].iter())
            .current_dir(&dir),
    );
}

/// Execute a command as a child process. Continue on success, exit if the command failed.
fn exec_child_command(cmd: &mut std::process::Command) {
    let mut child = cmd.env("INSIDE_BUILDC", "true").spawn().unwrap();
    match child.wait() {
        Ok(res) => match res.code() {
            Some(0) => {
                // Noop, contin
            }
            Some(code) => exit(code),
            None => exit(1),
        },
        Err(_) => exit(1),
    }
}
