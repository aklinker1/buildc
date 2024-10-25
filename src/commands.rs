use std::env;
use std::path::PathBuf;
use std::process::{exit, ExitStatus};

use crate::colors::{BOLD, CYAN, DIM, GREEN, MAGENTA, RED, RESET, YELLOW};
use crate::ctx::Ctx;
use crate::graph::Package;
use crate::hash::hash_package;
use crate::monorepo;
use crate::monorepo::Monorepo;

pub fn build(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    build_active_package_dependencies(ctx, |monorepo, package| {
        let hash = hash_package(&package)?;
        let cached =

        if package.config.cache && monorepo.restore_cache(&package, hash) {
            println!("{GREEN}[buildc] ✓{RESET} {}: Cached!", package.name)
        } else {
            exec(&package.dir, ctx.cmd_args.to_vec())
            if (package.config.cache) {
                monorepo.save_cache(&package, hash)?;
            }
            println!("{GREEN}[buildc] ✓{RESET} {}", package.name)
        }

        Ok(())
    });
    Ok(())
}

pub fn deps(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    // if let Some((_, package)) = build_active_package_dependencies(ctx) {
    //     exec(&package.dir, ctx.cmd_args.to_vec());
    // }
    Ok(())
}

pub fn all(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monorepo) = monorepo::find(ctx) {
        let graph = monorepo.to_graph();
        let packages = graph.get_overall_build_order();
        build_packages(ctx, &monorepo, packages);
    } else {
        println!("{YELLOW}{BOLD}[buildc] !{RESET} Not in monorepo");
    }
    println!("{GREEN}[buildc] ✓{RESET} Done");
    Ok(())
}

pub fn graph(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monorepo) = monorepo::find(ctx) {
        if ctx.is_debug {
            println!(
                "{DIM}[buildc] ⚙ Monorepo found at {:?}{RESET}",
                monorepo.root
            );
        }
        monorepo.to_graph().print()?;
    } else {
        println!("{YELLOW}{BOLD}[buildc] !{RESET} Not inside monorepo");
    }
    Ok(())
}

pub fn clean(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monorepo) = monorepo::find(ctx) {
        let cache_dir = monorepo.cache_dir();
        if ctx.is_debug {
            println!("{DIM}[buildc] ⚙ Deleting cache at {:?}{RESET}", cache_dir);
        }

        std::fs::remove_dir_all(monorepo.cache_dir())
            .unwrap_or_else(|err| println!("Failed to remove cache: {err}"))
    } else {
        if ctx.is_debug {
            println!("{DIM}[buildc] ⚙ Not in monorepo{RESET}");
        }
    }
    println!("{GREEN}[buildc] ✓{RESET} Done");
    Ok(())
}

fn build_packages(ctx: &Ctx, monorepo: &Monorepo, packages: Vec<Package>) {
    if ctx.is_debug {
        println!(
            "{DIM}[buildc] ⚙ Packages to build: {:?}{RESET}",
            packages
                .iter()
                .map(|package| &package.name)
                .collect::<Vec<_>>()
        );
    }

    for package in packages {
        let build_script = package.build_script.clone();
        if package.build_script.is_none() {
            println!(
                "{GREEN}[buildc] ✓{RESET} {}: Nothing to build",
                package.name
            );
            continue;
        }
        let build_script = build_script.unwrap();

        let mut args = monorepo.package_manager.run_cmd();
        args.push("build");
        if ctx.is_debug {
            println!(
                "{DIM}[buildc] ⚙ Running {args:?} in {:?}{RESET}",
                package.dir.strip_prefix(monorepo.root.clone()).unwrap()
            );
        }

        println!(
            "{MAGENTA}[buildc] ◐{RESET} {}: {CYAN}{build_script}{RESET}",
            package.name
        );
        match exec(&package.dir, args).code() {
            Some(0) => println!("{GREEN}[buildc] ✓{RESET} {}", package.name),
            Some(code) => exit(code),
            status => {
                eprintln!(
                    "{RED}{BOLD}[buildc] ✗{RESET} Failed to build package {}: {status:?}",
                    package.name
                );
                exit(1);
            }
        }
    }
}

fn build_active_package_dependencies<
    F: FnOnce(Monorepo, Package) -> Result<(), Box<dyn std::error::Error>>,
>(
    ctx: &Ctx,
    build_active_package: F,
) -> Result<(), Box<dyn std::error::Error>> {
    let monorepo = monorepo::find(ctx);
    if monorepo.is_none() {
        println!("{YELLOW}{BOLD}[buildc] !{RESET} Not in monorepo");
        return Ok(());
    }

    let monorepo = monorepo.unwrap();
    let graph = monorepo.to_graph();
    let active_package = graph.find_active_package();
    if active_package.is_none() {
        eprintln!("{RED}{BOLD}[buildc] !{RESET} Not inside a package directory, build");
        exit(1);
    }
    let active_package = active_package.unwrap();

    if env::var("INSIDE_BUILDC").unwrap_or_default() == "true" {
        // When inside another buildc command, we don't have to build
        // the children, the original buildc command that triggered
        // this build is already guaranteed to have built all this
        // package's dependencies.
    } else {
        let dependencies = graph.get_package_build_order(&active_package.name).unwrap();
        build_packages(ctx, &monorepo, dependencies);
    }

    return build_active_package(monorepo, active_package);
}

fn exec(dir: &PathBuf, args: Vec<&str>) -> ExitStatus {
    let mut child = std::process::Command::new(args[0])
        .args(args[1..].iter())
        .current_dir(&dir)
        .env("INSIDE_BUILDC", "true")
        .spawn()
        .unwrap();
    match child.wait() {
        Ok(res) => res,
        Err(err) => {
            eprintln!("{RED}{BOLD}[buildc] ✗{RESET} Failed to run {args:?}: {err}");
            exit(1);
        }
    }
}
