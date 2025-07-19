use serde::{Deserialize, Serialize};
use sled::Db;
use std::sync::Mutex;
use crate::game::{AccuracyStats, GameTurn};
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
    pub turn_history: Vec<GameTurn>,
    pub visual_stats: AccuracyStats,
    pub audio_stats: AccuracyStats,
}

impl GameSession {
    pub fn new(
        settings: UserSettings,
        turn_history: Vec<GameTurn>,
        visual_stats: AccuracyStats,
        audio_stats: AccuracyStats,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: format!("session_{}", now.timestamp_nanos_opt().unwrap_or_default()),
            timestamp: now,
            settings,
            turn_history,
            visual_stats,
            audio_stats,
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

pub fn load_all_sessions(db: &Db) -> Result<Vec<GameSession>, sled::Error> {
    let tree = db.open_tree(SESSIONS_TREE)?;
    let mut sessions: Vec<GameSession> = Vec::new();
    for item in tree.iter() {
        let (_, bytes) = item?;
        match bincode::deserialize::<GameSession>(&bytes) {
            Ok(session) => sessions.push(session),
            Err(e) => {
                // Log the error and skip the corrupted/outdated entry
                eprintln!("Skipping session due to deserialization error: {}", e);
            }
        }
    }
    // Sort by timestamp, newest first
    sessions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(sessions)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::GameTurn;

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
        let sessions = load_all_sessions(&db).unwrap();
        assert!(sessions.is_empty());

        // Create and save two sessions
        let settings = UserSettings::default();
        let turn_history1 = vec![GameTurn { visual: 0, audio: 'A' }];
        let stats1 = AccuracyStats { true_positives: 1, ..Default::default() };
        let session1 = GameSession::new(settings.clone(), turn_history1, stats1.clone(), stats1.clone());
        
        std::thread::sleep(std::time::Duration::from_millis(10));

        let turn_history2 = vec![GameTurn { visual: 1, audio: 'B' }];
        let stats2 = AccuracyStats { true_positives: 2, ..Default::default() };
        let session2 = GameSession::new(settings.clone(), turn_history2, stats2.clone(), stats2.clone());

        save_session(&db, &session1).unwrap();
        save_session(&db, &session2).unwrap();

        // Load sessions and check
        let sessions = load_all_sessions(&db).unwrap();
        assert_eq!(sessions.len(), 2);
        
        // Check if they are sorted correctly (newest first) and data is intact
        assert_eq!(sessions[0].visual_stats.true_positives, 2);
        assert_eq!(sessions[1].visual_stats.true_positives, 1);
    }
}
