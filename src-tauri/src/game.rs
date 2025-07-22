use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use crate::persistence::UserSettings;
use crate::sequence_generator;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub struct Stimulus {
    pub visual: u8,
    pub audio: char,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub struct UserResponse {
    pub visual_match: bool,
    pub audio_match: bool,
}

impl Default for UserResponse {
    fn default() -> Self {
        Self {
            visual_match: false,
            audio_match: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameEvent {
    pub turn_index: usize,
    pub stimulus: Stimulus,
    pub is_visual_match: bool,
    pub is_audio_match: bool,
    pub user_response: UserResponse,
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

impl AccuracyStats {
    /// Calculates accuracy based on the average of Sensitivity and Specificity.
    /// Accuracy = (Sensitivity + Specificity) / 2
    /// Sensitivity = TP / (TP + FN)
    /// Specificity = TN / (TN + FP)
    /// Returns a value between 0.0 and 1.0.
    pub fn calculate_accuracy(&self) -> f32 {
        let tp = self.true_positives as f32;
        let tn = self.true_negatives as f32;
        let fp = self.false_positives as f32;
        let f_n = self.false_negatives as f32;

        // Sensitivity = TP / (TP + FN)
        let sensitivity = if (tp + f_n) > 0.0 {
            tp / (tp + f_n)
        } else {
            1.0 // If there were no "match" trials, sensitivity is perfect.
        };

        // Specificity = TN / (TN + FP)
        let specificity = if (tn + fp) > 0.0 {
            tn / (tn + fp)
        } else {
            1.0 // If there were no "non-match" trials, specificity is perfect.
        };

        (sensitivity + specificity) / 2.0
    }


    /// Calculates the False Alarm Rate.
    /// Formula: False Positives / (False Positives + True Negatives)
    /// Returns a value between 0.0 and 1.0.
    pub fn calculate_false_alarm_rate(&self) -> f32 {
        let total_non_matches = self.false_positives + self.true_negatives;
        if total_non_matches == 0 {
            0.0
        } else {
            self.false_positives as f32 / total_non_matches as f32
        }
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct GameState {
    pub settings: UserSettings,
    pub is_running: bool,
    pub event_history: Vec<GameEvent>,
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
        );

        Self {
            settings,
            is_running: false,
            event_history: Vec::new(),
            current_turn_index: 0,
            visual_stats: AccuracyStats::default(),
            audio_stats: AccuracyStats::default(),
            audio_sequence,
            visual_sequence,
        }
    }

    /// Peeks at the next stimulus without advancing the game state.
    pub fn peek_stimulus(&self) -> Option<Stimulus> {
        if !self.is_running || self.current_turn_index >= self.settings.session_length {
            return None;
        }

        Some(Stimulus {
            visual: self.visual_sequence[self.current_turn_index],
            audio: self.audio_sequence[self.current_turn_index],
        })
    }
}

impl GameState {
    /// Processes user input for the current turn, records the event, and updates stats.
    pub fn process_turn(&mut self, user_response: UserResponse) {
        if !self.is_running {
            return;
        }
        
        let turn_idx = self.current_turn_index;
        let n = self.settings.n_level;

        let stimulus = Stimulus {
            visual: self.visual_sequence[turn_idx],
            audio: self.audio_sequence[turn_idx],
        };

        let mut is_visual_match = false;
        let mut is_audio_match = false;

        if turn_idx >= n {
            let target_stimulus = Stimulus {
                visual: self.visual_sequence[turn_idx - n],
                audio: self.audio_sequence[turn_idx - n],
            };
            is_visual_match = stimulus.visual == target_stimulus.visual;
            is_audio_match = stimulus.audio == target_stimulus.audio;
        }

        // --- Update Stats ---
        // Visual
        match (user_response.visual_match, is_visual_match) {
            (true, true) => self.visual_stats.true_positives += 1,
            (true, false) => self.visual_stats.false_positives += 1,
            (false, true) => self.visual_stats.false_negatives += 1,
            (false, false) => self.visual_stats.true_negatives += 1,
        }
        // Audio
        match (user_response.audio_match, is_audio_match) {
            (true, true) => self.audio_stats.true_positives += 1,
            (true, false) => self.audio_stats.false_positives += 1,
            (false, true) => self.audio_stats.false_negatives += 1,
            (false, false) => self.audio_stats.true_negatives += 1,
        }

        // --- Record Event ---
        self.event_history.push(GameEvent {
            turn_index: turn_idx,
            stimulus,
            is_visual_match,
            is_audio_match,
            user_response,
        });

        // --- Advance Game ---
        self.current_turn_index += 1;
        if self.current_turn_index >= self.settings.session_length {
            self.is_running = false;
        }
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
            session_length: 5,
        }
    }

    #[test]
    fn test_new_game_state() {
        let settings = default_settings();
        let game_state = GameState::new(settings.clone());
        assert_eq!(game_state.settings.n_level, 2);
        assert_eq!(game_state.is_running, false);
        assert_eq!(game_state.event_history.len(), 0);
        assert_eq!(game_state.current_turn_index, 0);
        assert_eq!(game_state.visual_stats.true_positives, 0);
    }

    #[test]
    fn test_peek_and_process_turn() {
        let mut settings = default_settings();
        settings.session_length = 5;
        let mut game_state = GameState::new(settings);
        game_state.is_running = true;

        for i in 0..5 {
            assert_eq!(game_state.current_turn_index, i);
            let stimulus = game_state.peek_stimulus().unwrap();
            assert!(stimulus.visual > 0); // Check that we got a real stimulus
            
            game_state.process_turn(UserResponse::default()); // Process turn i with default (no match) input
            assert_eq!(game_state.event_history.len(), i + 1);
        }

        // After 5 turns are processed, index is 5.
        assert_eq!(game_state.current_turn_index, 5);
        assert_eq!(game_state.is_running, false);
        
        // The next peek should return None
        assert!(game_state.peek_stimulus().is_none());
    }

    #[test]
    fn test_process_turn_with_pregen_sequence() {
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
        game_state.peek_stimulus();
        game_state.process_turn(UserResponse { visual_match: false, audio_match: false });
        assert_eq!(game_state.visual_stats.true_negatives, 1);
        assert_eq!(game_state.audio_stats.true_negatives, 1);
        assert_eq!(game_state.current_turn_index, 1);
        let event0 = &game_state.event_history[0];
        assert_eq!(event0.is_visual_match, false);
        assert_eq!(event0.user_response.visual_match, false);

        // --- Turn 1 ---
        game_state.peek_stimulus();
        game_state.process_turn(UserResponse { visual_match: false, audio_match: false });
        assert_eq!(game_state.visual_stats.true_negatives, 2);
        assert_eq!(game_state.audio_stats.true_negatives, 2);
        assert_eq!(game_state.current_turn_index, 2);

        // --- Turn 2 (Visual Match) ---
        game_state.peek_stimulus();
        game_state.process_turn(UserResponse { visual_match: true, audio_match: false });
        assert_eq!(game_state.visual_stats.true_positives, 1);
        assert_eq!(game_state.audio_stats.true_negatives, 3);
        assert_eq!(game_state.current_turn_index, 3);
        let event2 = &game_state.event_history[2];
        assert_eq!(event2.is_visual_match, true);
        assert_eq!(event2.user_response.visual_match, true);

        // --- Turn 3 (Audio Match) ---
        game_state.peek_stimulus();
        game_state.process_turn(UserResponse { visual_match: false, audio_match: true });
        assert_eq!(game_state.visual_stats.true_negatives, 3);
        assert_eq!(game_state.audio_stats.true_positives, 1);
        assert_eq!(game_state.current_turn_index, 4);
        let event3 = &game_state.event_history[3];
        assert_eq!(event3.is_audio_match, true);
        assert_eq!(event3.user_response.audio_match, true);

        // --- Turn 4 (Visual Match, user misses it) ---
        game_state.peek_stimulus();
        game_state.process_turn(UserResponse { visual_match: false, audio_match: false });
        assert_eq!(game_state.visual_stats.false_negatives, 1);
        assert_eq!(game_state.audio_stats.true_negatives, 4);
        assert_eq!(game_state.current_turn_index, 5);
        let event4 = &game_state.event_history[4];
        assert_eq!(event4.is_visual_match, true);
        assert_eq!(event4.user_response.visual_match, false);
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
            game_state.peek_stimulus();
            game_state.process_turn(UserResponse::default());
        }
        assert_eq!(game_state.current_turn_index, 3);
        assert_eq!(game_state.visual_stats.true_negatives, 3);
        assert_eq!(game_state.audio_stats.true_negatives, 3);

        // --- Turn 3 (Audio Match) ---
        game_state.peek_stimulus();
        game_state.process_turn(UserResponse { visual_match: false, audio_match: true });
        assert_eq!(game_state.audio_stats.true_positives, 1);
        assert_eq!(game_state.visual_stats.true_negatives, 4); // Correctly said no visual match
        assert_eq!(game_state.current_turn_index, 4);

        // --- Turn 4 (Visual Match) ---
        game_state.peek_stimulus();
        game_state.process_turn(UserResponse { visual_match: true, audio_match: false });
        assert_eq!(game_state.visual_stats.true_positives, 1);
        assert_eq!(game_state.audio_stats.true_negatives, 4); // Correctly said no audio match
        assert_eq!(game_state.current_turn_index, 5);

        // --- Turn 5 (Audio Match, user misses) ---
        game_state.peek_stimulus();
        game_state.process_turn(UserResponse { visual_match: false, audio_match: false });
        assert_eq!(game_state.audio_stats.false_negatives, 1);
        assert_eq!(game_state.visual_stats.true_negatives, 5);
        assert_eq!(game_state.current_turn_index, 6);
    }
}
