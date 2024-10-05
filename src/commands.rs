use crate::colors::{BOLD, DIM, GREEN, RESET, YELLOW};
use crate::ctx::Ctx;
use crate::monorepo;

pub fn build(_ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    println!("BUILD");
    // Implementation
    Ok(())
}

pub fn deps(_ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    println!("DEPS");
    // Implementation
    Ok(())
}

pub fn all(_ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    println!("ALL");
    // Implementation
    Ok(())
}

pub fn graph(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monorepo) = monorepo::find() {
        if ctx.is_debug {
            println!("{DIM}⚙ Monorepo found at {:?}{RESET}", monorepo.root);
        }
        monorepo.to_graph().print()?;
    } else {
        println!("{YELLOW}{BOLD}!{RESET} Not inside monorepo");
    }
    Ok(())
}

pub fn clean(ctx: &Ctx) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(monorepo) = monorepo::find() {
        if ctx.is_debug {
            println!("{DIM}⚙ Monorepo found at {:?}{RESET}", monorepo.root);
        }

        let cache_dir = monorepo.cache_dir();
        if ctx.is_debug {
            println!("{DIM}⚙ Deleting cache at {:?}{RESET}", cache_dir);
        }

        std::fs::remove_dir_all(monorepo.cache_dir())
            .unwrap_or_else(|err| println!("Failed to remove cache: {err}"))
    } else {
        if ctx.is_debug {
            println!("{DIM}⚙ Not in monorepo{RESET}");
        }
    }
    println!("{GREEN}✓{RESET} Done");
    Ok(())
}
