/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 Shomy
*/
use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};

use log::debug;

#[derive(Clone)]
pub struct ScatterFiles {
    dir: PathBuf,
}

impl ScatterFiles {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self { dir: dir.into() }
    }

    fn resolve(&self, file_path: &str) -> PathBuf {
        let mut clean = file_path.trim_start_matches("./");

        if let Some(stripped) = clean.strip_prefix("backup/") {
            clean = stripped.trim_start_matches("./");
        }

        if let Some(stripped) = clean.strip_prefix("out/") {
            clean = stripped.trim_start_matches("./");
        }

        self.dir.join(clean)
    }

    pub fn reader(&self, file_path: &str) -> anyhow::Result<(BufReader<File>, usize)> {
        let full_path = if Path::new(file_path).is_absolute() {
            PathBuf::from(file_path)
        } else {
            self.resolve(file_path)
        };

        debug!("Reading from input file: {:?}", full_path);

        let file = File::open(&full_path)?;
        let size = file.metadata()?.len() as usize;

        Ok((BufReader::new(file), size))
    }

    pub fn writer(&self, file_path: &str) -> anyhow::Result<BufWriter<File>> {
        let full_path = self.resolve(file_path);

        debug!("Writing to output file: {:?}", full_path);

        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        Ok(BufWriter::new(File::create(&full_path)?))
    }
}
