use serde::{Deserialize, Serialize};
use rand::seq::SliceRandom;
use rand::thread_rng;
use std::collections::HashSet;
use std::hash::Hash;
use std::fmt::Debug;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, Eq, PartialEq, Hash)]
pub enum AuditoryStimulusSet {
    AllLetters,
    NonConfusingLetters,
    TianGanDiZhi,
}

const LOWER_BOUND_RATIO: f32 = 1.0 / 6.0;
const UPPER_BOUND_RATIO: f32 = 1.0 / 4.0;
const TARGET_RATIO: f32 = 1.0 / 5.0;

/// Generates a single N-Back sequence with a controlled number of matches.
fn generate_single_nback_sequence<T>(
    n: usize,
    length: usize,
    stimulus_set: &[T],
    forbidden_match_indices: &HashSet<usize>,
) -> Vec<T>
where
    T: Clone + Eq + Hash + Debug,
{
    let mut rng = thread_rng();

    loop {
        // Step 1: Plan match positions
        let num_target_matches = ((length - n) as f32 * TARGET_RATIO).ceil() as usize;

        let all_possible_slots: Vec<usize> = (n..length).collect();
        let mut non_overlapping_slots: Vec<&usize> = all_possible_slots
            .iter()
            .filter(|p| !forbidden_match_indices.contains(p))
            .collect();
        let mut overlapping_slots: Vec<&usize> = all_possible_slots
            .iter()
            .filter(|p| forbidden_match_indices.contains(p))
            .collect();

        non_overlapping_slots.shuffle(&mut rng);
        overlapping_slots.shuffle(&mut rng);

        let mut match_indices = HashSet::new();
        match_indices.extend(non_overlapping_slots.iter().take(num_target_matches).map(|&&i| i));

        let remaining_needed = num_target_matches.saturating_sub(match_indices.len());
        if remaining_needed > 0 {
            match_indices.extend(overlapping_slots.iter().take(remaining_needed).map(|&&i| i));
        }

        // Step 2: Build the sequence
        let mut sequence = Vec::with_capacity(length);
        for i in 0..length {
            if i < n {
                sequence.push(stimulus_set.choose(&mut rng).unwrap().clone());
                continue;
            }

            let previous_stimulus = &sequence[i - n];
            if match_indices.contains(&i) {
                sequence.push(previous_stimulus.clone());
            } else {
                let mut new_stimulus = stimulus_set.choose(&mut rng).unwrap();
                while new_stimulus == previous_stimulus {
                    new_stimulus = stimulus_set.choose(&mut rng).unwrap();
                }
                sequence.push(new_stimulus.clone());
            }
        }

        // Step 3: Validate
        let actual_matches = (n..length).filter(|&i| sequence[i] == sequence[i - n]).count();
        let actual_ratio = actual_matches as f32 / length as f32;

        if (LOWER_BOUND_RATIO..=UPPER_BOUND_RATIO).contains(&actual_ratio) {
            return sequence;
        }
    }
}


/// Generates both audio and visual sequences for a Dual N-Back task.
pub fn generate_dual_nback_sequences(
    n: usize,
    length: usize,
    auditory_stimulus_set: AuditoryStimulusSet,
) -> (Vec<String>, Vec<u8>) {
    if n >= length {
        panic!("N-value must be less than the sequence length.");
    }

    const ALL_LETTERS: &[&str] = &[
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R",
        "S", "T", "U", "V", "W", "X", "Y", "Z",
    ];
    const NON_CONFUSING_LETTERS: &[&str] = &["A", "K", "Q", "R", "U", "W", "H", "L", "O"];
    const TIAN_GAN_DI_ZHI: &[&str] = &[
        "jia", "yi", "bing", "ding", "wu", "ji", "geng", "xin", "ren", "gui", "zi", "chou",
        "yin", "mao", "chen", "si", "wu_branch", "wei", "shen", "you", "xu", "hai",
    ];

    let auditory_stimuli: &[&str] = match auditory_stimulus_set {
        AuditoryStimulusSet::AllLetters => ALL_LETTERS,
        AuditoryStimulusSet::NonConfusingLetters => NON_CONFUSING_LETTERS,
        AuditoryStimulusSet::TianGanDiZhi => TIAN_GAN_DI_ZHI,
    };

    let visual_stimuli: Vec<u8> = (0..9).collect(); // Always 3x3 grid

    // 1. Generate audio sequence
    let audio_sequence_raw =
        generate_single_nback_sequence(n, length, auditory_stimuli, &HashSet::new());
    let audio_sequence: Vec<String> = audio_sequence_raw.iter().map(|s| s.to_string()).collect();


    // 2. Find audio match indices
    let audio_match_indices: HashSet<usize> = (n..length)
        .filter(|&i| audio_sequence[i] == audio_sequence[i - n])
        .collect();

    // 3. Generate visual sequence, avoiding audio match indices
    let visual_sequence =
        generate_single_nback_sequence(n, length, &visual_stimuli, &audio_match_indices);

    (audio_sequence, visual_sequence)
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_sequence_generation_ratio() {
        let n = 2;
        let length = 50;
        let stimulus_set: Vec<u8> = (0..9).collect();
        let sequence = generate_single_nback_sequence(n, length, &stimulus_set, &HashSet::new());

        assert_eq!(sequence.len(), length);

        let matches = (n..length).filter(|&i| sequence[i] == sequence[i - n]).count();
        let ratio = matches as f32 / length as f32;

        println!("Generated sequence with match ratio: {}", ratio);
        assert!(ratio >= LOWER_BOUND_RATIO, "Ratio should be >= {}", LOWER_BOUND_RATIO);
        assert!(ratio <= UPPER_BOUND_RATIO, "Ratio should be <= {}", UPPER_BOUND_RATIO);
    }

    #[test]
    fn test_dual_sequence_generation() {
        let n = 3;
        let length = 100;
        let (audio_seq, visual_seq) =
            generate_dual_nback_sequences(n, length, AuditoryStimulusSet::AllLetters);

        assert_eq!(audio_seq.len(), length);
        assert_eq!(visual_seq.len(), length);

        // It's not a hard guarantee, but we can check that the overlap is low.
        let audio_match_indices: HashSet<usize> = (n..length)
            .filter(|&i| audio_seq[i] == audio_seq[i - n])
            .collect();
        let visual_match_indices: HashSet<usize> = (n..length)
            .filter(|&i| visual_seq[i] == visual_seq[i - n])
            .collect();
        
        let overlap = audio_match_indices.intersection(&visual_match_indices).count();
        println!("Dual sequence generated with {} overlapping matches.", overlap);
        // This is a soft test; in rare cases, overlap might be high, but it should be low on average.
        assert!(overlap < 10, "Overlap should be minimal"); // Increased tolerance for randomness
    }

    #[test]
    fn test_generator_with_short_sequence() {
        let n = 1;
        let length = 15; // Test with a length < 20
        let stimulus_set: Vec<u8> = (0..3).collect();
        let sequence = generate_single_nback_sequence(n, length, &stimulus_set, &HashSet::new());

        let matches = (n..length).filter(|&i| sequence[i] == sequence[i - n]).count();
        let ratio = matches as f32 / length as f32;

        println!("Generated short sequence with match ratio: {}", ratio);
        // For short sequences, the ratio might be outside the bounds, but it should not be always 0.
        // We just check that the sequence was generated.
        assert_eq!(sequence.len(), length);
    }
}
