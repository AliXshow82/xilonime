mod discord;
mod legacy;

use std::path::Path;
use std::process::Command;

use tauri::{WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

#[derive(serde::Serialize)]
struct CommandResult {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

impl CommandResult {
    fn ok() -> Self {
        Self { ok: true, error: None }
    }

    fn err(message: impl Into<String>) -> Self {
        Self { ok: false, error: Some(message.into()) }
    }
}

fn find_vlc() -> Option<String> {
    let candidates = [
        std::env::var("VLC_PATH").ok(),
        Some(r"C:\Program Files\VideoLAN\VLC\vlc.exe".to_string()),
        Some(r"C:\Program Files (x86)\VideoLAN\VLC\vlc.exe".to_string()),
    ];
    candidates.into_iter().flatten().find(|file| Path::new(file).is_file())
}

#[tauri::command]
fn open_in_vlc(url: String) -> CommandResult {
    let url = url.trim();
    let lower = url.to_ascii_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") {
        return CommandResult::err("Invalid video URL");
    }
    let Some(vlc) = find_vlc() else {
        return CommandResult::err("VLC was not found on this PC");
    };
    match Command::new(vlc).arg(url).spawn() {
        Ok(_) => CommandResult::ok(),
        Err(error) => CommandResult::err(format!("Could not open VLC: {error}")),
    }
}

#[tauri::command]
async fn discord_set_activity(details: Option<String>, state: Option<String>) -> CommandResult {
    let result = tauri::async_runtime::spawn_blocking(move || {
        discord::set_activity(
            details.as_deref().unwrap_or("Watching anime"),
            state.as_deref().unwrap_or("Xilonimeh"),
        )
    })
    .await;
    match result {
        Ok(Ok(())) => CommandResult::ok(),
        Ok(Err(error)) => CommandResult::err(error),
        Err(_) => CommandResult::err("Discord وصل نشد"),
    }
}

#[tauri::command]
async fn discord_clear_activity() -> CommandResult {
    match tauri::async_runtime::spawn_blocking(discord::clear_activity).await {
        Ok(Ok(())) => CommandResult::ok(),
        Ok(Err(error)) => CommandResult::err(error),
        Err(_) => CommandResult::err("Discord clear failed"),
    }
}

#[tauri::command]
fn legacy_import_done(app: tauri::AppHandle) {
    legacy::mark_done(&app);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            open_in_vlc,
            discord_set_activity,
            discord_clear_activity,
            legacy_import_done
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("ژایلونیمه")
                .inner_size(1280.0, 820.0)
                .min_inner_size(960.0, 640.0)
                .decorations(false)
                .background_color(tauri::window::Color(10, 10, 15, 255))
                .on_navigation(move |url| {
                    // Links that leave the app open in the user's browser instead.
                    if url.host_str() == Some("tauri.localhost") || url.scheme() == "tauri" {
                        return true;
                    }
                    if matches!(url.scheme(), "http" | "https") {
                        let _ = handle.opener().open_url(url.as_str(), None::<&str>);
                    }
                    false
                });

            // Debug builds only: XILO_DEBUG_PORT opens the WebView2 DevTools protocol for testing.
            #[cfg(debug_assertions)]
            if let Ok(port) = std::env::var("XILO_DEBUG_PORT") {
                builder = builder.additional_browser_args(&format!(
                    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --remote-debugging-port={port} --remote-allow-origins=*"
                ));
            }

            // Carries the list a user kept in the old Electron build over to this one.
            if let Some(script) = legacy::import_script(app.handle()) {
                builder = builder.initialization_script(&script);
            }

            builder.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Xilonimeh");
}
