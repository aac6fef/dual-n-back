mod game;
mod persistence;
pub mod sequence_generator;

use game::{AppState, GameState, UserInput, GameTurn};
use persistence::{
    DbState, GameSession, UserSettings, load_all_sessions, load_settings, save_session, save_settings,
};
use serde::Serialize;
use tauri::{Manager, State};

// --- Frontend-Specific Data Structures ---
// This ensures that the data sent to the frontend matches what it expects,
// without altering the core game logic's internal state representation.

#[derive(Serialize, Clone)]
struct FrontendGameTurn {
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

impl From<&GameTurn> for FrontendGameTurn {
    fn from(turn: &GameTurn) -> Self {
        Self {
            visual_stimulus: VisualStimulus { position: turn.visual },
            audio_stimulus: AudioStimulus { letter: turn.audio },
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FrontendGameState {
    is_running: bool,
    n_level: usize,
    session_length: usize,
    current_turn_index: usize,
    current_turn: Option<FrontendGameTurn>,
    visual_hit_rate: f32,
    visual_false_alarm_rate: f32,
    audio_hit_rate: f32,
    audio_false_alarm_rate: f32,
    // Add correct answers for the current turn for immediate feedback
    correct_visual_match: bool,
    correct_audio_match: bool,
}

impl From<&GameState> for FrontendGameState {
    fn from(state: &GameState) -> Self {
        let n = state.settings.n_level;
        let idx = state.current_turn_index;

        let mut correct_visual_match = false;
        let mut correct_audio_match = false;

        if idx >= n {
            if let Some(current_turn) = state.turn_history.get(idx) {
                if let Some(target_turn) = state.turn_history.get(idx - n) {
                    correct_visual_match = current_turn.visual == target_turn.visual;
                    correct_audio_match = current_turn.audio == target_turn.audio;
                }
            }
        }

        Self {
            is_running: state.is_running,
            n_level: state.settings.n_level,
            session_length: state.settings.session_length,
            current_turn_index: state.current_turn_index,
            current_turn: state.turn_history.last().map(FrontendGameTurn::from),
            visual_hit_rate: state.visual_stats.calculate_hit_rate(),
            visual_false_alarm_rate: state.visual_stats.calculate_false_alarm_rate(),
            audio_hit_rate: state.audio_stats.calculate_hit_rate(),
            audio_false_alarm_rate: state.audio_stats.calculate_false_alarm_rate(),
            correct_visual_match,
            correct_audio_match,
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
    db_state: State<DbState>,
    settings: UserSettings,
) -> Result<(), String> {
    let db = db_state.0.lock().unwrap();
    save_settings(&db, &settings).map_err(|e| e.to_string())
}

// --- Game History Commands ---
#[tauri::command]
fn get_game_history(db_state: State<DbState>) -> Result<Vec<GameSession>, String> {
    let db = db_state.0.lock().unwrap();
    load_all_sessions(&db).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_history_as_csv(db_state: State<DbState>) -> Result<String, String> {
    let db = db_state.0.lock().unwrap();
    let sessions = load_all_sessions(&db).map_err(|e| e.to_string())?;

    let records: Vec<CsvRecord> = sessions.into_iter().map(|s| CsvRecord {
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
fn start_game(app_state: State<AppState>, db_state: State<DbState>) {
    let mut game_state = app_state.0.lock().unwrap();
    let db = db_state.0.lock().unwrap();
    
    // Create a new game state, which pre-generates the sequences
    let mut settings = load_settings(&db).unwrap_or_default();
    if settings.session_length < 20 {
        settings.session_length = 20; // Enforce minimum length
    }
    *game_state = GameState::new(settings);
    game_state.is_running = true;
    
    // Perform the first tick to load the first stimulus into history
    game_state.tick();
}

#[tauri::command]
fn submit_user_input(app_state: State<AppState>, db_state: State<DbState>, user_input: UserInput) {
    let mut game_state = app_state.0.lock().unwrap();
    if !game_state.is_running {
        return;
    }

    // Process the user's input for the turn that was just displayed
    game_state.process_input(&user_input);

    // Prepare the next turn. Tick will set is_running to false if the session is now over.
    game_state.tick();

    // If the game has just stopped after the tick, save the session.
    if !game_state.is_running {
        // We need to clone the stats *before* the game_state is dropped.
        let session = GameSession::new(
            game_state.settings.clone(),
            game_state.turn_history.clone(),
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
            export_history_as_csv
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
