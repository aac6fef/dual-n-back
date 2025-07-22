// --- Data Structures mirroring Rust backend ---
export interface AccuracyStats {
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
}

export interface UserSettings {
  n_level: number;
  speed_ms: number;
  session_length: number;
}

export interface GameSessionSummary {
  id: string;
  timestamp: string; // ISO 8601 string
  settings: UserSettings;
  visual_stats: AccuracyStats;
  audio_stats: AccuracyStats;
}

export interface GameEvent {
  turn_index: number;
  stimulus: {
    visual: number;
    audio: string;
  };
  is_visual_match: boolean;
  is_audio_match: boolean;
  user_response: {
    visual_match: boolean;
    audio_match: boolean;
  };
}

export interface GameSessionDetails extends GameSessionSummary {
  event_history: GameEvent[];
}


// --- Helper Functions ---
const calculateRate = (numerator: number, denominator: number): number => {
  if (denominator === 0) {
    // If denominator is 0, it implies there were no opportunities for this event.
    // e.g., no non-matches to correctly reject.
    // A rate of 100% is appropriate if the numerator is also 0 (no false alarms).
    return numerator === 0 ? 100.0 : 0.0;
  }
  return (numerator / denominator) * 100;
};

/**
 * Calculates accuracy based on the average of Sensitivity and Specificity.
 * Accuracy = (Sensitivity + Specificity) / 2
 * Sensitivity (Hit Rate) = TP / (TP + FN)
 * Specificity (Correct Rejection Rate) = TN / (TN + FP)
 * @param stats The accuracy statistics for a given modality.
 * @returns The calculated accuracy as a percentage (0-100).
 */
export const calculateAccuracy = (stats: AccuracyStats): number => {
  const { true_positives: tp, true_negatives: tn, false_positives: fp, false_negatives: fn } = stats;

  // Sensitivity = TP / (TP + FN)
  // If there were no actual matches (TP + FN = 0), sensitivity is considered perfect (1.0).
  const sensitivity = (tp + fn) > 0 ? tp / (tp + fn) : 1.0;

  // Specificity = TN / (TN + FP)
  // If there were no actual non-matches (TN + FP = 0), specificity is considered perfect (1.0).
  const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 1.0;

  // The final accuracy is the average of sensitivity and specificity, converted to a percentage.
  return ((sensitivity + specificity) / 2) * 100;
};

export const getCalculatedStats = (stats: AccuracyStats) => {
  const totalMatches = stats.true_positives + stats.false_negatives;
  const totalNonMatches = stats.true_negatives + stats.false_positives;

  return {
    hitRate: calculateRate(stats.true_positives, totalMatches),
    missRate: calculateRate(stats.false_negatives, totalMatches),
    falseAlarmRate: calculateRate(stats.false_positives, totalNonMatches),
    correctRejectionRate: calculateRate(stats.true_negatives, totalNonMatches),
  };
};

export const calculateHitRate = (stats: AccuracyStats): number => {
  const totalMatches = stats.true_positives + stats.false_negatives;
  if (totalMatches === 0) return 100.0; // Perfect score if there were no matches to catch
  return (stats.true_positives / totalMatches) * 100;
};

export const calculateFalseAlarmRate = (stats: AccuracyStats): number => {
  const totalNonMatches = stats.false_positives + stats.true_negatives;
  if (totalNonMatches === 0) return 0.0;
  return (stats.false_positives / totalNonMatches) * 100;
};

export const transformHistoryData = (sessions: GameSessionSummary[]) => {
  return sessions.map((session, index) => ({
    id: session.id,
    x: index, // Use index for even spacing on the x-axis
    date: new Date(session.timestamp).toLocaleDateString(),
    nLevel: session.settings.n_level,
    speed: session.settings.speed_ms,
    sessionLength: session.settings.session_length,
    visualAccuracy: calculateAccuracy(session.visual_stats),
    audioAccuracy: calculateAccuracy(session.audio_stats),
    visualFalseAlarmRate: calculateFalseAlarmRate(session.visual_stats),
    audioFalseAlarmRate: calculateFalseAlarmRate(session.audio_stats),
  }));
};
