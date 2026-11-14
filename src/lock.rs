use std::fs::{self, File, OpenOptions, TryLockError};
use std::path::Path;
use std::process::exit;

use crate::colors::{BOLD, DIM, MAGENTA, RED, RESET};
use crate::ctx::Ctx;

/// Holds an exclusive lock on the monorepo's cache until dropped.
pub struct CacheLock {
    _file: File,
}

/// Block until no other buildc process is building packages in this monorepo.
///
/// This is an OS-level advisory lock, so it's released automatically if the
/// process crashes or is killed, and never goes stale.
pub fn acquire(ctx: &Ctx, cache_dir: &Path) -> CacheLock {
    let lock_path = cache_dir.join("buildc.lock");
    let file = fs::create_dir_all(cache_dir)
        .and_then(|_| {
            OpenOptions::new()
                .create(true)
                .truncate(false)
                .write(true)
                .open(&lock_path)
        })
        .unwrap_or_else(|e| {
            eprintln!("{RED}{BOLD}[buildc] ✘{RESET} Failed to open {lock_path:?}: {e}");
            exit(1);
        });

    if ctx.is_debug {
        println!("{DIM}[buildc] → Acquiring lock {lock_path:?}{RESET}");
    }

    match file.try_lock() {
        Ok(()) => {}
        Err(TryLockError::WouldBlock) => {
            println!("{MAGENTA}[buildc] ◐{RESET} Waiting for other buildc processes to finish...");
            file.lock().unwrap_or_else(|e| {
                eprintln!("{RED}{BOLD}[buildc] ✘{RESET} Failed to acquire lock: {e}");
                exit(1);
            });
        }
        Err(TryLockError::Error(e)) => {
            eprintln!("{RED}{BOLD}[buildc] ✘{RESET} Failed to acquire lock: {e}");
            exit(1);
        }
    }

    CacheLock { _file: file }
}
