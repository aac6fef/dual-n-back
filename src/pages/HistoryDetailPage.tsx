import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import {
  BrainCircuit,
  Clock,
  ListChecks,
  Target,
  Ear,
  HelpCircle,
  Eye,
  MousePointerClick,
  BookOpen,
} from 'lucide-react';
import Card from '../components/ui/Card';
import ColorGridLegend from '../components/ColorGridLegend';
import './HistoryDetailPage.css';

// --- Data Structures mirroring Rust backend ---
interface AccuracyStats {
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
}

interface Stimulus {
  visual: number;
  audio: string;
}

interface UserResponse {
  visual_match: boolean;
  audio_match: boolean;
}

interface GameEvent {
  turn_index: number;
  stimulus: Stimulus;
  is_visual_match: boolean;
  is_audio_match: boolean;
  user_response: UserResponse;
}

interface UserSettings {
  n_level: number;
  speed_ms: number;
  session_length: number;
}

interface GameSessionDetails {
  id: string;
  timestamp: string;
  settings: UserSettings;
  event_history: GameEvent[];
  visual_stats: AccuracyStats;
  audio_stats: AccuracyStats;
}

// --- Helper Functions for Stats ---
const calculateRate = (numerator: number, denominator: number): number => {
  if (denominator === 0) {
    return numerator === 0 ? 100.0 : 0.0;
  }
  return (numerator / denominator) * 100;
};

const getCalculatedStats = (stats: AccuracyStats) => {
  const totalMatches = stats.true_positives + stats.false_negatives;
  const totalNonMatches = stats.true_negatives + stats.false_positives;

  return {
    hitRate: calculateRate(stats.true_positives, totalMatches),
    missRate: calculateRate(stats.false_negatives, totalMatches),
    falseAlarmRate: calculateRate(stats.false_positives, totalNonMatches),
    correctRejectionRate: calculateRate(stats.true_negatives, totalNonMatches),
  };
};


const HistoryDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { t } = useTranslation();
  const [session, setSession] = useState<GameSessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionDetails = async () => {
      setIsLoading(true);
      try {
        const result = await invoke<GameSessionDetails>('get_session_details', { sessionId });
        if (result) {
          setSession(result);
        } else {
          setError(t('historyDetail.notFound'));
        }
      } catch (err) {
        console.error("Failed to fetch session details:", err);
        setError(t('historyDetail.error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, t]);

  if (isLoading) {
    return <div>{t('history.loading')}</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!session) {
    return <div>{t('historyDetail.noData')}</div>;
  }

  const renderEvent = (event: GameEvent) => {
    const visualMatchClass = event.is_visual_match ? 'match' : '';
    const audioMatchClass = event.is_audio_match ? 'match' : '';
    const visualUserClickClass = event.user_response.visual_match ? 'user-click-visual' : '';
    const audioUserClickClass = event.user_response.audio_match ? 'user-click-audio' : '';

    return (
      <div key={event.turn_index} className="event-item">
        <div className="event-index">{event.turn_index + 1}</div>
        <div className={`event-stimulus visual-stimulus ${visualMatchClass}`}>
          <div className={`grid-cell-detail active-cell-detail cell-${event.stimulus.visual}`}>
            <span className={visualUserClickClass}>{event.stimulus.visual}</span>
          </div>
        </div>
        <div className={`event-stimulus audio-stimulus ${audioMatchClass} ${audioUserClickClass}`}>
          {event.stimulus.audio}
        </div>
      </div>
    );
  };

  return (
    <div className="history-detail-container">
      <h1 className="page-title">{t('historyDetail.title', { date: new Date(session.timestamp).toLocaleString() })}</h1>

      <Card className="detail-summary-card">
        <div className="summary-item"><BrainCircuit size={18} /><strong>{t('history.nLevel')}:</strong> {session.settings.n_level}</div>
        <div className="summary-item"><Clock size={18} /><strong>{t('history.speed')}:</strong> {session.settings.speed_ms}ms</div>
        <div className="summary-item"><ListChecks size={18} /><strong>{t('history.sessionLength')}:</strong> {session.settings.session_length}</div>
      </Card>

      <Card className="stats-card">
        <div className="stats-column">
          <h3 className="stats-title"><Eye size={20} /> {t('history.visual')}</h3>
          <div className="stat-item"><span>{t('historyDetail.stats.hitRate')}:</span> <span>{getCalculatedStats(session.visual_stats).hitRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.missRate')}:</span> <span>{getCalculatedStats(session.visual_stats).missRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.faRate')}:</span> <span>{getCalculatedStats(session.visual_stats).falseAlarmRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.crRate')}:</span> <span>{getCalculatedStats(session.visual_stats).correctRejectionRate.toFixed(1)}%</span></div>
        </div>
        <div className="stats-column">
          <h3 className="stats-title"><Ear size={20} /> {t('history.audio')}</h3>
          <div className="stat-item"><span>{t('historyDetail.stats.hitRate')}:</span> <span>{getCalculatedStats(session.audio_stats).hitRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.missRate')}:</span> <span>{getCalculatedStats(session.audio_stats).missRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.faRate')}:</span> <span>{getCalculatedStats(session.audio_stats).falseAlarmRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.crRate')}:</span> <span>{getCalculatedStats(session.audio_stats).correctRejectionRate.toFixed(1)}%</span></div>
        </div>
      </Card>

      <Card className="legends-card">
        <h3 className="legend-title"><HelpCircle size={20} /> {t('historyDetail.legend.title')}</h3>
        <div className="legends-container">
          <div className="legend-group">
            <div className="legend-item">
              <div className="legend-box match"></div>
              <span><Target size={16} /> {t('historyDetail.legend.expectedMatch')}</span>
            </div>
            <div className="legend-item">
              <div className="legend-text user-click-audio">Text</div>
              <span><MousePointerClick size={16} /> {t('historyDetail.legend.userAction')}</span>
            </div>
          </div>
          <div className="legend-group">
            <h4 className="legend-subtitle">{t('historyDetail.legend.colorPosition')}</h4>
            <ColorGridLegend />
          </div>
        </div>
      </Card>

      <h2 className="page-subtitle"><BookOpen size={22} /> {t('historyDetail.sequence')}</h2>
      <Card className="sequence-card">
        <div className="sequence-header">
          <div>#</div>
          <div><Eye size={18} /> {t('history.visual')}</div>
          <div><Ear size={18} /> {t('history.audio')}</div>
        </div>
        <div className="sequence-grid">
          {session.event_history.map(renderEvent)}
        </div>
      </Card>
    </div>
  );
};

export default HistoryDetailPage;
