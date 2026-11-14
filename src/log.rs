//! Consistent CLI output. Only the status icon is colored so long lists of
//! packages stay easy to scan.

use std::fmt::Arguments;

use crate::colors::{DIM, RESET};

pub fn print_line(color: &str, icon: &str, args: Arguments) {
    println!("{DIM}[buildc]{RESET} {color}{icon}{RESET} {args}");
}

pub fn eprint_line(color: &str, icon: &str, args: Arguments) {
    eprintln!("{DIM}[buildc]{RESET} {color}{icon}{RESET} {args}");
}

pub fn print_debug(args: Arguments) {
    println!("{DIM}[buildc] → {args}{RESET}");
}

macro_rules! success {
    ($($arg:tt)*) => {
        $crate::log::print_line($crate::colors::GREEN, "✓", format_args!($($arg)*))
    };
}

macro_rules! progress {
    ($($arg:tt)*) => {
        $crate::log::print_line($crate::colors::MAGENTA, "◐", format_args!($($arg)*))
    };
}

macro_rules! warning {
    ($($arg:tt)*) => {
        $crate::log::eprint_line($crate::colors::YELLOW, "!", format_args!($($arg)*))
    };
}

macro_rules! error {
    ($($arg:tt)*) => {
        $crate::log::eprint_line($crate::colors::RED, "✘", format_args!($($arg)*))
    };
}

macro_rules! debug {
    ($ctx:expr, $($arg:tt)*) => {
        if $ctx.is_debug {
            $crate::log::print_debug(format_args!($($arg)*))
        }
    };
}

pub(crate) use {debug, error, progress, success, warning};
