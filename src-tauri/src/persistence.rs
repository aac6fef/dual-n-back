use serde::{Deserialize, Serialize};
use sled::Db;
use std::sync::Mutex;
use crate::game::{AccuracyStats, GameEvent};
use chrono::{DateTime, Utc};

// --- User Settings ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UserSettings {
    pub n_level: usize,
    pub speed_ms: u64,
    pub session_length: usize,
    // In the future, we can add stimulus_types: enum { Visual, Audio, Dual }
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            n_level: 2,
            speed_ms: 2000,
            session_length: 20,
        }
    }
}

// --- Game Session History ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GameSession {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub settings: UserSettings,
    pub event_history: Vec<GameEvent>,
    pub visual_stats: AccuracyStats,
    pub audio_stats: AccuracyStats,
}

impl GameSession {
    pub fn new(
        settings: UserSettings,
        event_history: Vec<GameEvent>,
        visual_stats: AccuracyStats,
        audio_stats: AccuracyStats,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: format!("session_{}", now.timestamp_nanos_opt().unwrap_or_default()),
            timestamp: now,
            settings,
            event_history,
            visual_stats,
            audio_stats,
        }
    }
}

/// A lighter version of GameSession for list views, omitting the heavy event history.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GameSessionSummary {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub settings: UserSettings,
    pub visual_stats: AccuracyStats,
    pub audio_stats: AccuracyStats,
}

impl From<&GameSession> for GameSessionSummary {
    fn from(session: &GameSession) -> Self {
        Self {
            id: session.id.clone(),
            timestamp: session.timestamp,
            settings: session.settings.clone(),
            visual_stats: session.visual_stats.clone(),
            audio_stats: session.audio_stats.clone(),
        }
    }
}

// --- Database Interaction ---

pub struct DbState(pub Mutex<Db>);

const SETTINGS_KEY: &str = "user_settings";
const SESSIONS_TREE: &str = "game_sessions";

pub fn save_settings(db: &Db, settings: &UserSettings) -> Result<(), sled::Error> {
    let bytes = bincode::serialize(settings).unwrap();
    db.insert(SETTINGS_KEY, bytes)?;
    Ok(())
}

pub fn load_settings(db: &Db) -> Result<UserSettings, sled::Error> {
    match db.get(SETTINGS_KEY)? {
        Some(bytes) => {
            let settings = bincode::deserialize(&bytes).unwrap_or_else(|_| UserSettings::default());
            Ok(settings)
        }
        None => Ok(UserSettings::default()),
    }
}

pub fn save_session(db: &Db, session: &GameSession) -> Result<(), sled::Error> {
    let tree = db.open_tree(SESSIONS_TREE)?;
    let bytes = bincode::serialize(session).unwrap();
    tree.insert(session.id.as_bytes(), bytes)?;
    Ok(())
}

pub fn load_all_sessions(db: &Db) -> Result<Vec<GameSessionSummary>, sled::Error> {
    let tree = db.open_tree(SESSIONS_TREE)?;
    let mut summaries: Vec<GameSessionSummary> = Vec::new();
    for item in tree.iter() {
        let (_, bytes) = item?;
        // We still deserialize the full session, but immediately convert it to a summary
        match bincode::deserialize::<GameSession>(&bytes) {
            Ok(session) => summaries.push((&session).into()),
            Err(e) => {
                eprintln!("Skipping session due to deserialization error: {}", e);
            }
        }
    }
    // Sort by timestamp, newest first
    summaries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(summaries)
}

pub fn load_session_by_id(db: &Db, session_id: &str) -> Result<Option<GameSession>, sled::Error> {
    let tree = db.open_tree(SESSIONS_TREE)?;
    match tree.get(session_id.as_bytes())? {
        Some(bytes) => {
            match bincode::deserialize::<GameSession>(&bytes) {
                Ok(session) => Ok(Some(session)),
                Err(e) => {
                    eprintln!("Failed to deserialize session {}: {}", session_id, e);
                    Ok(None)
                }
            }
        }
        None => Ok(None),
    }
}

pub fn clear_all_data(db: &Db) -> Result<(), sled::Error> {
    db.drop_tree(SESSIONS_TREE)?;
    db.remove(SETTINGS_KEY)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::{GameEvent, Stimulus, UserResponse};

    fn get_temp_db() -> Db {
        sled::Config::new().temporary(true).open().unwrap()
    }

    #[test]
    fn test_save_and_load_settings() {
        let db = get_temp_db();
        
        // Test loading default settings
        let loaded_settings = load_settings(&db).unwrap();
        assert_eq!(loaded_settings.n_level, 2);

        // Test saving and loading custom settings
        let custom_settings = UserSettings {
            n_level: 3,
            speed_ms: 1500,
            session_length: 25,
        };
        save_settings(&db, &custom_settings).unwrap();
        let loaded_settings = load_settings(&db).unwrap();
        assert_eq!(loaded_settings.n_level, 3);
        assert_eq!(loaded_settings.session_length, 25);
    }

    #[test]
    fn test_save_and_load_sessions() {
        let db = get_temp_db();
        
        // Initially, there should be no sessions
        let summaries = load_all_sessions(&db).unwrap();
        assert!(summaries.is_empty());

        // Create and save two sessions
        let settings = UserSettings::default();
        let event_history1 = vec![GameEvent {
            turn_index: 0,
            stimulus: Stimulus { visual: 1, audio: 'A' },
            is_visual_match: false,
            is_audio_match: false,
            user_response: UserResponse::default(),
        }];
        let stats1 = AccuracyStats { true_positives: 1, ..Default::default() };
        let session1 = GameSession::new(settings.clone(), event_history1, stats1.clone(), stats1.clone());
        
        std::thread::sleep(std::time::Duration::from_millis(10));

        let event_history2 = vec![]; // Empty for simplicity
        let stats2 = AccuracyStats { true_positives: 2, ..Default::default() };
        let session2 = GameSession::new(settings.clone(), event_history2, stats2.clone(), stats2.clone());

        save_session(&db, &session1).unwrap();
        save_session(&db, &session2).unwrap();

        // Load session summaries and check
        let summaries = load_all_sessions(&db).unwrap();
        assert_eq!(summaries.len(), 2);
        
        // Check if they are sorted correctly (newest first) and data is intact
        assert_eq!(summaries[0].id, session2.id);
        assert_eq!(summaries[0].visual_stats.true_positives, 2);
        assert_eq!(summaries[1].visual_stats.true_positives, 1);

        // Load a single full session by ID and check its details
        let loaded_session1 = load_session_by_id(&db, &session1.id).unwrap().unwrap();
        assert_eq!(loaded_session1.id, session1.id);
        assert_eq!(loaded_session1.event_history.len(), 1);
        assert_eq!(loaded_session1.event_history[0].stimulus.visual, 1);

        // Test loading a non-existent session
        let non_existent = load_session_by_id(&db, "non-existent-id").unwrap();
        assert!(non_existent.is_none());
    }
}
