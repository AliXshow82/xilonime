//! One-time import of the data the Electron build kept in Chromium's localStorage.
//!
//! Electron stored the anime list in `%APPDATA%\<app name>\Local Storage\leveldb`
//! under the `file://` origin. This build runs on `http://tauri.localhost`, so that
//! data would otherwise be invisible. On first start the database is copied (the
//! old app may still hold it open), read, and the `xiloAnimeVault.*` keys are handed
//! to the page in an initialization script that fills in any key the page lacks.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use rusty_leveldb::{LdbIterator, Options, DB};
use tauri::{AppHandle, Manager};

const MARKER: &str = "legacy-import-done";
const KEY_PREFIX: &str = "xiloAnimeVault.";
/// Chromium's key layout: `_` + origin + `\0` + encoding byte + key.
const ORIGIN_PREFIX: &[u8] = b"_file://\x00";

fn marker_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join(MARKER))
}

pub fn mark_done(app: &AppHandle) {
    if let Some(path) = marker_path(app) {
        if let Some(dir) = path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        let _ = fs::write(path, b"1");
    }
}

/// Electron folder names the old builds may have used.
fn candidate_dirs() -> Vec<PathBuf> {
    let Ok(appdata) = std::env::var("APPDATA") else {
        return Vec::new();
    };
    ["ژایلونیمه", "xilonime", "Xilonimeh"]
        .iter()
        .map(|name| Path::new(&appdata).join(name).join("Local Storage").join("leveldb"))
        .filter(|dir| dir.is_dir())
        .collect()
}

/// Chromium prefixes stored strings with 0 for UTF-16LE or 1 for Latin-1.
fn decode(bytes: &[u8]) -> Option<String> {
    let (&encoding, rest) = bytes.split_first()?;
    match encoding {
        0 => {
            if rest.len() % 2 != 0 {
                return None;
            }
            let units: Vec<u16> = rest.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
            String::from_utf16(&units).ok()
        }
        1 => Some(rest.iter().map(|&b| b as char).collect()),
        _ => None,
    }
}

fn copy_db(source: &Path, target: &Path) -> std::io::Result<()> {
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        if entry.file_name() == "LOCK" || !entry.file_type()?.is_file() {
            continue;
        }
        fs::copy(entry.path(), target.join(entry.file_name()))?;
    }
    Ok(())
}

fn read_dir_entries(dir: &Path, scratch: &Path) -> BTreeMap<String, String> {
    let mut found = BTreeMap::new();
    let _ = fs::remove_dir_all(scratch);
    if copy_db(dir, scratch).is_err() {
        return found;
    }
    let mut options = Options::default();
    options.create_if_missing = false;
    if let Ok(mut db) = DB::open(scratch, options) {
        if let Ok(mut iter) = db.new_iter() {
            while let Some((key, value)) = LdbIterator::next(&mut iter) {
                let Some(raw_key) = key.strip_prefix(ORIGIN_PREFIX) else {
                    continue;
                };
                let (Some(name), Some(text)) = (decode(raw_key), decode(&value)) else {
                    continue;
                };
                if name.starts_with(KEY_PREFIX) {
                    found.insert(name, text);
                }
            }
        }
    }
    let _ = fs::remove_dir_all(scratch);
    found
}

pub fn import_script(app: &AppHandle) -> Option<String> {
    if marker_path(app).is_some_and(|path| path.exists()) {
        return None;
    }
    let scratch = std::env::temp_dir().join("xilonimeh-legacy-import");

    // The folder with the most saved keys is the one that was really used.
    let data = candidate_dirs()
        .iter()
        .map(|dir| read_dir_entries(dir, &scratch))
        .max_by_key(|entries| entries.len())
        .filter(|entries| !entries.is_empty());

    let Some(data) = data else {
        mark_done(app);
        return None;
    };
    let json = serde_json::to_string(&data).ok()?;
    Some(format!(
        r#"(function () {{
  if (location.hostname !== 'tauri.localhost') return;
  try {{
    if (localStorage.getItem('xiloDesktop.legacyImported')) return;
    var data = {json};
    for (var key in data) {{
      if (localStorage.getItem(key) === null) localStorage.setItem(key, data[key]);
    }}
    localStorage.setItem('xiloDesktop.legacyImported', '1');
  }} catch (error) {{}}
}})();"#
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Run with XILO_TEST_LEVELDB pointing at a Chromium `Local Storage\leveldb` folder.
    #[test]
    fn reads_chromium_local_storage() {
        let Ok(dir) = std::env::var("XILO_TEST_LEVELDB") else {
            return;
        };
        let scratch = std::env::temp_dir().join("xilonimeh-legacy-test");
        let entries = read_dir_entries(Path::new(&dir), &scratch);
        println!("{entries:#?}");
        assert_eq!(entries.get("xiloAnimeVault.language.alpha02").map(String::as_str), Some("fa"));
        assert!(entries["xiloAnimeVault.animes.alpha02"].contains("ناروتو"));
        assert!(!entries.contains_key("unrelated.key"));
    }
}
