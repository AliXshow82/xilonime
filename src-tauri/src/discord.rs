use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use discord_rich_presence::activity::{Activity, Assets, Timestamps};
use discord_rich_presence::{DiscordIpc, DiscordIpcClient};

const DEFAULT_CLIENT_ID: &str = "1363259189207630124";

static CLIENT: Mutex<Option<DiscordIpcClient>> = Mutex::new(None);

fn client_id() -> String {
    std::env::var("XILONIME_DISCORD_CLIENT_ID").unwrap_or_else(|_| DEFAULT_CLIENT_ID.to_string())
}

fn truncate(text: &str, max: usize) -> String {
    text.chars().take(max).collect()
}

pub fn set_activity(details: &str, state: &str) -> Result<(), String> {
    let mut guard = CLIENT.lock().map_err(|_| "Discord وصل نشد".to_string())?;
    if guard.is_none() {
        let mut client = DiscordIpcClient::new(&client_id());
        client.connect().map_err(|_| "Discord وصل نشد".to_string())?;
        *guard = Some(client);
    }

    let details = truncate(details, 120);
    let state = truncate(state, 120);
    let started = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or_default();
    let activity = Activity::new()
        .details(&details)
        .state(&state)
        .timestamps(Timestamps::new().start(started))
        .assets(Assets::new().large_image("xilonimeh").large_text("Xilonimeh"));

    let client = guard.as_mut().expect("client was just set");
    if client.set_activity(activity.clone()).is_err() {
        // Discord was restarted since we connected; reconnect once.
        client.reconnect().map_err(|_| "Discord وصل نشد".to_string())?;
        client.set_activity(activity).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn clear_activity() -> Result<(), String> {
    let mut guard = CLIENT.lock().map_err(|_| "Discord clear failed".to_string())?;
    if let Some(client) = guard.as_mut() {
        client.clear_activity().map_err(|e| e.to_string())?;
    }
    Ok(())
}
