use md5;
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;

use crate::globby::globby;
use crate::graph::Package;

pub fn hash_package(package: &Package) -> std::io::Result<String> {
    let mut files = globby(&package.dir, package.config.include, package.config.exclude);
    files.sort();

    let dir_hash = files
        .iter()
        .map(|file| {
            let hash = hash_file(file).expect("Failed to hash file");
            let relative_path = file
                .strip_prefix(&package.dir.clone())
                .unwrap_or(file)
                .to_string_lossy();
            format!("{hash}-{relative_path}")
        })
        .collect::<Vec<String>>()
        .join("\n");

    let digest = md5::compute(&dir_hash);
    Ok(format!("{:x}", digest))
}

fn hash_file(file: &PathBuf) -> std::io::Result<String> {
    let mut file = File::open(file).expect("Failed to open file");
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).expect("Failed to read file");

    let digest = md5::compute(&buffer);
    Ok(format!("{:x}", digest))
}
