use std::env;
use std::process;

use colors::{BLUE, BOLD, CYAN, DIM, GREEN, RESET, YELLOW};
use ctx::Ctx;

mod colors;
mod commands;
mod ctx;
mod graph;
mod monorepo;

const VERSION: &str = "2.0.0-alpha1";

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let is_debug = is_debug();
    let args: Vec<String> = env::args().collect();
    let separator = args.iter().position(|arg| arg == "--");

    let (buildc_args, cmd_args): (&[String], &[String]) = match separator {
        Some(index) => (&args[1..index], &args[index + 1..]),
        None => (&args[1..], &[]),
    };
    if is_debug {
        println!("{DIM}⚙ Buildc args:  {buildc_args:?}{RESET}");
        println!("{DIM}⚙ Command args: {cmd_args:?}{RESET}");
    }

    if array_includes_either(buildc_args, "-v", "--version") {
        return print_version();
    }
    if array_includes_either(buildc_args, "-h", "--help") {
        return print_help();
    }

    let ctx = Ctx {
        is_debug,
        cmd_args,
        buildc_args,
    };

    match (buildc_args.len(), cmd_args.len()) {
        (0, 0) => print_help(),
        (0, _) => commands::build(&ctx),
        _ => match buildc_args[0].as_str() {
            "deps" => commands::deps(&ctx),
            "all" => commands::all(&ctx),
            "graph" => commands::graph(&ctx),
            "clean" | "clear" => commands::clean(&ctx),
            _ => print_unknown_command(),
        },
    }
    .map_err(|err| {
        eprintln!("Unhandled error: {}", err);
        process::exit(1);
    })
}

#[rustfmt::skip]
fn print_help() -> Result<(), Box<dyn std::error::Error>> {
    println!("{BOLD}{BLUE}Buildc{RESET} orchestrates and caches builds for JS monorepos. {DIM}({}){RESET}", VERSION);
    println!();
    println!("{BOLD}Usage: buildc <command> {DIM}[-- ...args]{RESET}");
    println!();
    println!("{BOLD}Commands:{RESET}");
    println!("  {BOLD}{BLUE  }     {RESET}    {DIM}-- unbuild{RESET}       Build dependencies and run the command, caching the result");
    println!("  {BOLD}{BLUE  }deps {RESET}    {DIM}-- vitest {RESET}       Ensure dependencies are build before running the command");
    println!("  {BOLD}{BLUE  }all  {RESET}    {DIM}          {RESET}       Build all packages in the monorepo, caching the results");
    println!();
    println!("  {BOLD}{GREEN }graph{RESET}    {DIM}          {RESET}       Print the dependency graph");
    println!();
    println!("  {BOLD}{YELLOW}clean{RESET}    {DIM}          {RESET}       Delete build cache {DIM}(buildc clear){RESET}");
    println!();
    println!("{BOLD}Examples:{RESET}");
    println!();
    println!("  buildc -- unbuild              {DIM}Run unbuild after building dependencies{RESET}");
    println!("  buildc -- tsup  --minify       {DIM}Run TSup with CLI flags{RESET}");
    println!("  buildc deps -- jest            {DIM}Run tests after after dependencies are built{RESET}");
    println!("  buildc deps -- tsc --noEmit    {DIM}Run type checks after dependencies are built{RESET}");
    println!();
    println!("Learn more about Buildc:    {CYAN}https://github.com/aklinker1/buildc{RESET}");
    Ok(())
}

fn print_version() -> Result<(), Box<dyn std::error::Error>> {
    println!("{}", VERSION);
    Ok(())
}

fn print_unknown_command() -> Result<(), Box<dyn std::error::Error>> {
    println!("Unknown command. Run {CYAN}buildc --help{RESET} for more details.");
    Ok(())
}

fn array_includes_either(arr: &[String], a: &str, b: &str) -> bool {
    arr.iter().any(|item| item == a || item == b)
}

fn is_debug() -> bool {
    std::env::var("DEBUG")
        .map(|v| v == "buildc")
        .unwrap_or(false)
}
