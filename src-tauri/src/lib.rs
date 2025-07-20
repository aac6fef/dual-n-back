mod game;
mod persistence;
pub mod sequence_generator;

use chrono::Duration;
use game::{AccuracyStats, AppState, GameEvent, GameState, Stimulus, UserResponse};
use persistence::{
    clear_all_data, load_all_sessions, load_session_by_id, load_settings, save_session,
    save_settings, DbState, GameSession, GameSessionSummary, UserSettings,
};
use rand::prelude::*;
use serde::Serialize;
use tauri::{Manager, State};

// --- Frontend-Specific Data Structures ---
// This ensures that the data sent to the frontend matches what it expects,
// without altering the core game logic's internal state representation.

#[derive(Serialize, Clone)]
struct FrontendStimulus {
    visual_stimulus: VisualStimulus,
    audio_stimulus: AudioStimulus,
}

#[derive(Serialize, Clone)]
struct VisualStimulus {
    position: u8,
}

#[derive(Serialize, Clone)]
struct AudioStimulus {
    letter: char,
}

impl From<&Stimulus> for FrontendStimulus {
    fn from(stimulus: &Stimulus) -> Self {
        Self {
            visual_stimulus: VisualStimulus {
                position: stimulus.visual,
            },
            audio_stimulus: AudioStimulus {
                letter: stimulus.audio,
            },
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FrontendGameState {
    is_running: bool,
    settings: UserSettings,
    current_turn_index: usize,
    current_stimulus: Option<FrontendStimulus>,
    visual_hit_rate: f32,
    visual_false_alarm_rate: f32,
    audio_hit_rate: f32,
    audio_false_alarm_rate: f32,
    // Add correct answers for the current turn for immediate feedback
    is_visual_match: bool,
    is_audio_match: bool,
}

impl From<&GameState> for FrontendGameState {
    fn from(state: &GameState) -> Self {
        let n = state.settings.n_level;
        let idx = state.current_turn_index;

        let mut is_visual_match = false;
        let mut is_audio_match = false;

        // Determine if the upcoming turn is a match
        if state.is_running && idx >= n {
            if let Some(current_stimulus) = state.peek_stimulus() {
                // The event history contains the processed turns. The last event is idx-1.
                // We need to compare the upcoming stimulus (at idx) with the stimulus from n turns ago (at idx-n).
                // The stimulus at idx-n is stored in the event at index idx-n.
                if let Some(target_event) = state.event_history.get(idx - n) {
                    is_visual_match = current_stimulus.visual == target_event.stimulus.visual;
                    is_audio_match = current_stimulus.audio == target_event.stimulus.audio;
                }
            }
        }

        Self {
            is_running: state.is_running,
            settings: state.settings.clone(),
            current_turn_index: state.current_turn_index,
            current_stimulus: state.peek_stimulus().as_ref().map(FrontendStimulus::from),
            visual_hit_rate: state.visual_stats.calculate_hit_rate(),
            visual_false_alarm_rate: state.visual_stats.calculate_false_alarm_rate(),
            audio_hit_rate: state.audio_stats.calculate_hit_rate(),
            audio_false_alarm_rate: state.audio_stats.calculate_false_alarm_rate(),
            is_visual_match,
            is_audio_match,
        }
    }
}


// --- CSV Export Struct ---
#[derive(Serialize)]
struct CsvRecord {
    timestamp: String,
    n_level: usize,
    speed_ms: u64,
    session_length: usize,
    visual_true_positives: u32,
    visual_true_negatives: u32,
    visual_false_positives: u32,
    visual_false_negatives: u32,
    audio_true_positives: u32,
    audio_true_negatives: u32,
    audio_false_positives: u32,
    audio_false_negatives: u32,
}

// --- Settings Commands ---
#[tauri::command]
fn load_user_settings(db_state: State<DbState>) -> Result<UserSettings, String> {
    let db = db_state.0.lock().unwrap();
    load_settings(&db).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_user_settings(
    app_state: State<AppState>,
    db_state: State<DbState>,
    settings: UserSettings,
) -> Result<(), String> {
    // First, save the settings to the persistent database
    let db = db_state.0.lock().unwrap();
    save_settings(&db, &settings).map_err(|e| e.to_string())?;

    // Then, update the in-memory game state with the new settings
    let mut game_state = app_state.0.lock().unwrap();
    game_state.settings = settings;

    Ok(())
}

#[tauri::command]
fn reset_all_data(db_state: State<DbState>) -> Result<(), String> {
    let db = db_state.0.lock().unwrap();
    clear_all_data(&db).map_err(|e| e.to_string())
}

#[tauri::command]
async fn generate_fake_history(db_state: State<'_, DbState>) -> Result<(), String> {
    let db = db_state.0.lock().unwrap().clone();
    tauri::async_runtime::spawn(async move {
        let mut rng = thread_rng();
        for i in 0..15 {
            let settings = UserSettings {
                n_level: rng.gen_range(2..=4),
                speed_ms: rng.gen_range(2000..=3000),
                session_length: rng.gen_range(20..=30),
            };

            // Create a temporary game state to generate a valid session
            let mut temp_game = GameState::new(settings.clone());
            temp_game.is_running = true;

            while temp_game.is_running {
                // Simulate user input with some randomness
                let user_response = UserResponse {
                    visual_match: rng.gen_bool(0.2), // 20% chance of pressing the button
                    audio_match: rng.gen_bool(0.2),
                };
                temp_game.process_turn(user_response);
            }

            let mut session = GameSession::new(
                settings,
                temp_game.event_history,
                temp_game.visual_stats,
                temp_game.audio_stats,
            );
            
            // Backdate the session
            session.timestamp = session.timestamp - Duration::days(i);

            if let Err(e) = save_session(&db, &session) {
                eprintln!("Failed to save generated session: {}", e);
            }
        }
    })
    .await
    .map_err(|e| e.to_string())
}

// --- Game History Commands ---
#[tauri::command]
fn get_game_history(db_state: State<DbState>) -> Result<Vec<GameSessionSummary>, String> {
    let db = db_state.0.lock().unwrap();
    load_all_sessions(&db).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_session_details(
    db_state: State<DbState>,
    session_id: String,
) -> Result<Option<GameSession>, String> {
    let db = db_state.0.lock().unwrap();
    load_session_by_id(&db, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_history_as_csv(db_state: State<DbState>) -> Result<String, String> {
    let db = db_state.0.lock().unwrap();
    let summaries = load_all_sessions(&db).map_err(|e| e.to_string())?;

    let records: Vec<CsvRecord> = summaries.into_iter().map(|s| CsvRecord {
        timestamp: s.timestamp.to_rfc3339(),
        n_level: s.settings.n_level,
        speed_ms: s.settings.speed_ms,
        session_length: s.settings.session_length,
        visual_true_positives: s.visual_stats.true_positives,
        visual_true_negatives: s.visual_stats.true_negatives,
        visual_false_positives: s.visual_stats.false_positives,
        visual_false_negatives: s.visual_stats.false_negatives,
        audio_true_positives: s.audio_stats.true_positives,
        audio_true_negatives: s.audio_stats.true_negatives,
        audio_false_positives: s.audio_stats.false_positives,
        audio_false_negatives: s.audio_stats.false_negatives,
    }).collect();

    let mut wtr = csv::Writer::from_writer(vec![]);
    for record in records {
        wtr.serialize(record).map_err(|e| e.to_string())?;
    }

    let csv_string = String::from_utf8(wtr.into_inner().map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(csv_string)
}


// --- Game Logic Commands ---
#[tauri::command]
fn start_game(app_state: State<AppState>) {
    let mut game_state = app_state.0.lock().unwrap();
    
    let mut settings = game_state.settings.clone();
    if settings.session_length < 10 {
        settings.session_length = 10; // Enforce minimum length
    }
    if settings.session_length > 100 {
        settings.session_length = 100; // Enforce maximum length
    }

    *game_state = GameState::new(settings);
    game_state.is_running = true;
}

#[tauri::command]
fn submit_user_input(
    app_state: State<AppState>,
    db_state: State<DbState>,
    user_response: UserResponse,
) {
    let mut game_state = app_state.0.lock().unwrap();
    if !game_state.is_running {
        return;
    }

    game_state.process_turn(user_response);

    // If the game has just stopped, save the session.
    if !game_state.is_running {
        let session = GameSession::new(
            game_state.settings.clone(),
            game_state.event_history.clone(),
            game_state.visual_stats.clone(),
            game_state.audio_stats.clone(),
        );
        let db = db_state.0.lock().unwrap();
        if let Err(e) = save_session(&db, &session) {
            eprintln!("Failed to save game session: {}", e);
        }
    }
}

#[tauri::command]
fn get_game_state(state: State<AppState>) -> FrontendGameState {
    let game_state = state.0.lock().unwrap();
    FrontendGameState::from(&*game_state)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let app_data_dir = handle
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
            }

            let db_path = app_data_dir.join("nback.db");
            let db = sled::open(db_path).expect("Failed to open database");

            let initial_settings = load_settings(&db).unwrap_or_default();
            
            handle.manage(DbState(db.into()));
            handle.manage(AppState(GameState::new(initial_settings).into()));
            
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_game,
            submit_user_input,
            get_game_state,
            load_user_settings,
            save_user_settings,
            get_game_history,
            get_session_details,
            export_history_as_csv,
            reset_all_data,
            generate_fake_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
