//! Resolve exact runtime paths and report missing files without guessing dependencies.
use std::path::{Path, PathBuf};
pub fn python_path(root: &Path) -> PathBuf {
    root.join(if cfg!(windows) {
        ".venv/Scripts/python.exe"
    } else {
        ".venv/bin/python"
    })
}
pub fn development_root(candidates: &[PathBuf]) -> Result<PathBuf, String> {
    for root in candidates {
        if root.join("server/engine.py").is_file() && root.join("package.json").is_file() {
            return Ok(root.clone());
        }
    }
    Err(format!("The project directory was not found. Checked paths: {}. Open a terminal in the project and run npm run desktop.",candidates.iter().map(|p|p.display().to_string()).collect::<Vec<_>>().join("; ")))
}
pub fn require_python(root: &Path) -> Result<PathBuf, String> {
    let path = python_path(root);
    if !path.is_file() {
        return Err(format!("Project Python environment missing: {}. From {} run npm run desktop (automatically prepares the environment) or py -3.12 scripts/configurar.py --dev.",path.display(),root.display()));
    }
    Ok(path)
}
pub fn release_engine(resources: Option<&Path>, executable: &Path) -> Result<PathBuf, String> {
    let names = if cfg!(windows) {
        ["gosu-engine.exe", "voz-engine.exe"]
    } else {
        ["gosu-engine", "voz-engine"]
    };
    let mut paths = Vec::new();
    for root in resources.into_iter().chain(executable.parent()) {
        for name in names {
            for directory in [root.join("engine"), root.join("engine/gosu-engine")] {
                let path = directory.join(name);
                if path.is_file() {
                    return Ok(path);
                }
                paths.push(path);
            }
        }
    }
    Err(format!("The bundled engine was not found. Checked paths: {}. An EXE from target/release needs the adjacent engine directory; do not copy the EXE alone. Build with npm run desktop:build or install the complete package.",paths.iter().map(|p|p.display().to_string()).collect::<Vec<_>>().join("; ")))
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    fn temp() -> PathBuf {
        static NEXT: AtomicU64 = AtomicU64::new(0);
        temp_in(&std::env::temp_dir(), &NEXT)
    }

    fn temp_in(parent: &Path, next: &AtomicU64) -> PathBuf {
        loop {
            let path = parent.join(format!(
                "gosu-path-test-{}-{}",
                std::process::id(),
                next.fetch_add(1, Ordering::Relaxed)
            ));
            // Reserve exclusively: timestamps can collide between parallel tests.
            match std::fs::create_dir(&path) {
                Ok(()) => return path,
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => panic!("Cannot create test directory {}: {error}", path.display()),
            }
        }
    }

    #[test]
    fn temporary_directories_never_reuse_existing_paths() {
        let root = temp();
        let first = temp_in(&root, &AtomicU64::new(0));
        std::fs::write(first.join("owner"), "first").unwrap();
        let second = temp_in(&root, &AtomicU64::new(0));
        assert_ne!(first, second);
        std::fs::remove_dir_all(second).unwrap();
        assert_eq!(
            std::fs::read_to_string(first.join("owner")).unwrap(),
            "first"
        );
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn parallel_temporary_directories_are_independent() {
        let root = temp();
        let next = AtomicU64::new(0);
        let barrier = std::sync::Barrier::new(16);
        let paths = std::thread::scope(|scope| {
            let handles: Vec<_> = (0..16)
                .map(|_| {
                    scope.spawn(|| {
                        barrier.wait();
                        temp_in(&root, &next)
                    })
                })
                .collect();
            handles
                .into_iter()
                .map(|h| h.join().unwrap())
                .collect::<Vec<_>>()
        });
        assert_eq!(
            paths.iter().collect::<std::collections::HashSet<_>>().len(),
            16
        );
        for path in paths {
            assert!(path.is_dir());
            std::fs::remove_dir(path).unwrap();
        }
        std::fs::remove_dir(root).unwrap();
    }
    #[test]
    fn missing_python_reports_the_actual_path() {
        let root = temp();
        let error = require_python(&root).unwrap_err();
        assert!(error.contains(&python_path(&root).display().to_string()));
        assert!(error.contains("npm run desktop"));
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn moved_debug_build_can_use_a_valid_runtime_source_root() {
        let root = temp();
        std::fs::create_dir_all(root.join("server")).unwrap();
        std::fs::write(root.join("server/engine.py"), "").unwrap();
        std::fs::write(root.join("package.json"), "{}").unwrap();
        assert_eq!(
            development_root(&[root.join("missing"), root.clone()]).unwrap(),
            root
        );
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn release_binary_finds_its_adjacent_engine() {
        let root = temp();
        std::fs::create_dir_all(root.join("engine")).unwrap();
        let file = root.join(if cfg!(windows) {
            "engine/gosu-engine.exe"
        } else {
            "engine/gosu-engine"
        });
        std::fs::write(&file, "").unwrap();
        assert_eq!(
            release_engine(Some(&root.join("missing")), &root.join("app.exe")).unwrap(),
            file
        );
        std::fs::remove_dir_all(root).unwrap();
    }
}
