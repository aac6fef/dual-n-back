mod game;
mod persistence;
pub mod sequence_generator;

use game::{AppState, GameState, UserInput};
use persistence::{
    DbState, GameSession, UserSettings, load_all_sessions, load_settings, save_session, save_settings,
};
use tauri::{Manager, State};

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
fn get_game_state(state: State<AppState>) -> GameState {
    state.0.lock().unwrap().clone()
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_game,
            submit_user_input,
            get_game_state,
            load_user_settings,
            save_user_settings,
            get_game_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
