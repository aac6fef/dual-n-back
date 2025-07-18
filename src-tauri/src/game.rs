use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use crate::persistence::UserSettings;
use crate::sequence_generator;

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct GameTurn {
    pub visual: u8,
    pub audio: char,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AccuracyStats {
    // Correctly identified a match
    pub true_positives: u32,
    // Correctly identified a non-match
    pub true_negatives: u32,
    // Incorrectly claimed a match
    pub false_positives: u32,
    // Incorrectly missed a match
    pub false_negatives: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct GameState {
    pub settings: UserSettings,
    pub is_running: bool,
    pub turn_history: Vec<GameTurn>,
    pub current_turn_index: usize, // How many turns have been *processed*
    pub visual_stats: AccuracyStats,
    pub audio_stats: AccuracyStats,
    
    // Pre-generated sequences for the entire session
    #[serde(skip_serializing)]
    audio_sequence: Vec<char>,
    #[serde(skip_serializing)]
    visual_sequence: Vec<u8>,
}

impl GameState {
    pub fn new(settings: UserSettings) -> Self {
        let (audio_sequence, visual_sequence) = sequence_generator::generate_dual_nback_sequences(
            settings.n_level,
            settings.session_length,
            settings.grid_size,
        );

        Self {
            settings,
            is_running: false,
            turn_history: Vec::new(),
            current_turn_index: 0,
            visual_stats: AccuracyStats::default(),
            audio_stats: AccuracyStats::default(),
            audio_sequence,
            visual_sequence,
        }
    }

    pub fn tick(&mut self) {
        if !self.is_running {
            return;
        }

        // Stop condition: if the number of processed turns equals the session length
        if self.current_turn_index >= self.settings.session_length {
            self.is_running = false;
            return;
        }

        // Add the next pre-generated turn to the history
        let next_turn = GameTurn {
            visual: self.visual_sequence[self.current_turn_index],
            audio: self.audio_sequence[self.current_turn_index],
        };
        self.turn_history.push(next_turn);
        
        // This index now represents the turn that was just added and is ready for input
        // It will be incremented *after* processing
    }
}

#[derive(serde::Deserialize)]
pub struct UserInput {
    pub position_match: bool,
    pub audio_match: bool,
}

impl GameState {
    /// Processes user input for the current turn and updates accuracy statistics.
    pub fn process_input(&mut self, user_input: &UserInput) {
        let turn_idx = self.current_turn_index;

        // No matches are possible before the n-th turn.
        if turn_idx < self.settings.n_level {
            if user_input.position_match { self.visual_stats.false_positives += 1; } 
            else { self.visual_stats.true_negatives += 1; }

            if user_input.audio_match { self.audio_stats.false_positives += 1; }
            else { self.audio_stats.true_negatives += 1; }
            
            self.current_turn_index += 1; // Move to next turn
            return;
        }

        let current_turn = &self.turn_history[turn_idx];
        let target_turn = &self.turn_history[turn_idx - self.settings.n_level];

        // --- Visual Stats ---
        let actual_pos_match = current_turn.visual == target_turn.visual;
        match (user_input.position_match, actual_pos_match) {
            (true, true) => self.visual_stats.true_positives += 1,
            (true, false) => self.visual_stats.false_positives += 1,
            (false, true) => self.visual_stats.false_negatives += 1,
            (false, false) => self.visual_stats.true_negatives += 1,
        }

        // --- Audio Stats ---
        let actual_audio_match = current_turn.audio == target_turn.audio;
        match (user_input.audio_match, actual_audio_match) {
            (true, true) => self.audio_stats.true_positives += 1,
            (true, false) => self.audio_stats.false_positives += 1,
            (false, true) => self.audio_stats.false_negatives += 1,
            (false, false) => self.audio_stats.true_negatives += 1,
        }

        self.current_turn_index += 1; // Move to next turn
    }
}

// AppState to be managed by Tauri
pub struct AppState(pub Mutex<GameState>);

#[cfg(test)]
mod tests {
    use super::*;

    fn default_settings() -> UserSettings {
        UserSettings {
            n_level: 2,
            speed_ms: 1000,
            grid_size: 3,
            session_length: 5,
        }
    }

    #[test]
    fn test_new_game_state() {
        let settings = default_settings();
        let game_state = GameState::new(settings.clone());
        assert_eq!(game_state.settings.n_level, 2);
        assert_eq!(game_state.is_running, false);
        assert_eq!(game_state.turn_history.len(), 0);
        assert_eq!(game_state.current_turn_index, 0);
        assert_eq!(game_state.visual_stats.true_positives, 0);
    }

    #[test]
    fn test_tick_and_session_end() {
        let mut settings = default_settings();
        settings.session_length = 5;
        let mut game_state = GameState::new(settings);
        game_state.is_running = true;

        for i in 0..5 {
            assert_eq!(game_state.current_turn_index, i);
            game_state.tick(); // Adds turn i to history
            assert_eq!(game_state.turn_history.len(), i + 1);
            game_state.process_input(&UserInput { position_match: false, audio_match: false }); // Processes turn i
        }

        // After 5 turns are processed, index is 5.
        assert_eq!(game_state.current_turn_index, 5);
        
        // The next tick should stop the game
        game_state.tick();
        assert_eq!(game_state.is_running, false);
    }

    #[test]
    fn test_process_input_with_pregen_sequence() {
        let mut settings = default_settings();
        settings.n_level = 2;
        let mut game_state = GameState::new(settings);
        
        // Manually override the pre-generated sequences for a predictable test
        game_state.audio_sequence = vec!['A', 'B', 'C', 'B', 'D'];
        game_state.visual_sequence = vec![1, 2, 1, 4, 1];
        // Expected matches:
        // Turn 2: Visual (1 == 1)
        // Turn 3: Audio ('B' == 'B')
        // Turn 4: Visual (1 == 1)

        game_state.is_running = true;

        // --- Turn 0 ---
        game_state.tick(); // Add T0 to history
        assert_eq!(game_state.turn_history.len(), 1);
        game_state.process_input(&UserInput { position_match: false, audio_match: false }); // Process T0
        assert_eq!(game_state.visual_stats.true_negatives, 1);
        assert_eq!(game_state.audio_stats.true_negatives, 1);
        assert_eq!(game_state.current_turn_index, 1);

        // --- Turn 1 ---
        game_state.tick(); // Add T1
        game_state.process_input(&UserInput { position_match: false, audio_match: false }); // Process T1
        assert_eq!(game_state.visual_stats.true_negatives, 2);
        assert_eq!(game_state.audio_stats.true_negatives, 2);
        assert_eq!(game_state.current_turn_index, 2);

        // --- Turn 2 (Visual Match) ---
        game_state.tick(); // Add T2
        game_state.process_input(&UserInput { position_match: true, audio_match: false }); // Process T2
        assert_eq!(game_state.visual_stats.true_positives, 1);
        assert_eq!(game_state.audio_stats.true_negatives, 3);
        assert_eq!(game_state.current_turn_index, 3);

        // --- Turn 3 (Audio Match) ---
        game_state.tick(); // Add T3
        game_state.process_input(&UserInput { position_match: false, audio_match: true }); // Process T3
        assert_eq!(game_state.visual_stats.true_negatives, 3);
        assert_eq!(game_state.audio_stats.true_positives, 1);
        assert_eq!(game_state.current_turn_index, 4);

        // --- Turn 4 (Visual Match, user misses it) ---
        game_state.tick(); // Add T4
        game_state.process_input(&UserInput { position_match: false, audio_match: false }); // Process T4
        assert_eq!(game_state.visual_stats.false_negatives, 1);
        assert_eq!(game_state.audio_stats.true_negatives, 4);
        assert_eq!(game_state.current_turn_index, 5);
    }

    #[test]
    fn test_logic_with_n_equals_3() {
        let mut settings = default_settings();
        settings.n_level = 3; // Test with N=3
        settings.session_length = 6;
        let mut game_state = GameState::new(settings);
        
        game_state.audio_sequence = vec!['A', 'B', 'C', 'A', 'D', 'C'];
        game_state.visual_sequence = vec![1, 2, 3, 4, 2, 6];
        // Expected matches:
        // Turn 3: Audio ('A' == 'A')
        // Turn 4: Visual (2 == 2)
        // Turn 5: Audio ('C' == 'C')

        game_state.is_running = true;

        // Process turns 0, 1, 2 (no matches possible)
        for _ in 0..3 {
            game_state.tick();
            game_state.process_input(&UserInput { position_match: false, audio_match: false });
        }
        assert_eq!(game_state.current_turn_index, 3);
        assert_eq!(game_state.visual_stats.true_negatives, 3);
        assert_eq!(game_state.audio_stats.true_negatives, 3);

        // --- Turn 3 (Audio Match) ---
        game_state.tick();
        game_state.process_input(&UserInput { position_match: false, audio_match: true });
        assert_eq!(game_state.audio_stats.true_positives, 1);
        assert_eq!(game_state.visual_stats.true_negatives, 4); // Correctly said no visual match
        assert_eq!(game_state.current_turn_index, 4);

        // --- Turn 4 (Visual Match) ---
        game_state.tick();
        game_state.process_input(&UserInput { position_match: true, audio_match: false });
        assert_eq!(game_state.visual_stats.true_positives, 1);
        assert_eq!(game_state.audio_stats.true_negatives, 4); // Correctly said no audio match
        assert_eq!(game_state.current_turn_index, 5);

        // --- Turn 5 (Audio Match, user misses) ---
        game_state.tick();
        game_state.process_input(&UserInput { position_match: false, audio_match: false });
        assert_eq!(game_state.audio_stats.false_negatives, 1);
        assert_eq!(game_state.visual_stats.true_negatives, 5);
        assert_eq!(game_state.current_turn_index, 6);
    }
}
