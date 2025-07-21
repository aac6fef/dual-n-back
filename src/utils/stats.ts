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
  return sessions.map(session => ({
    id: session.id,
    date: new Date(session.timestamp).toLocaleDateString(),
    nLevel: session.settings.n_level,
    speed: session.settings.speed_ms,
    sessionLength: session.settings.session_length,
    visualHitRate: calculateHitRate(session.visual_stats),
    audioHitRate: calculateHitRate(session.audio_stats),
    visualFalseAlarmRate: calculateFalseAlarmRate(session.visual_stats),
    audioFalseAlarmRate: calculateFalseAlarmRate(session.audio_stats),
  }));
};
