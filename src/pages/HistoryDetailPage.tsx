import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
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
  Play,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ColorGridLegend from '../components/ColorGridLegend';
import { GameSessionDetails, GameEvent, getCalculatedStats } from '../utils/stats';
import { useSettings } from '../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import './HistoryDetailPage.css';

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

const HistoryDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, setSettings, saveSettings } = useSettings();
  const [session, setSession] = useState<GameSessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visualStats = useMemo(() => {
    if (!session) return null;
    return getCalculatedStats(session.visual_stats);
  }, [session]);

  const audioStats = useMemo(() => {
    if (!session) return null;
    return getCalculatedStats(session.audio_stats);
  }, [session]);

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

  if (!session || !visualStats || !audioStats) {
    return <div>{t('historyDetail.noData')}</div>;
  }

  const isPostGameView = location.state?.fromGame === true;

  const handlePlayAgain = async () => {
    if (!session) return;
    // Update the global settings with the settings from this session
    setSettings({
      ...settings, // Keep client-side settings like theme
      n_level: session.settings.n_level,
      speed_ms: session.settings.speed_ms,
      session_length: session.settings.session_length,
    });
    // Persist the settings
    await saveSettings();
    // Navigate to the game page to start a new game
    navigate('/');
  };

  return (
    <div className="history-detail-container">
      <h1 className="page-title">{t('historyDetail.title', { date: new Date(session.timestamp).toLocaleString() })}</h1>

      <div className="detail-actions">
        <Button onClick={handlePlayAgain}>
          <Play size={16} className="btn-icon" />
          {t('historyDetail.playAgainSameSettings')}
        </Button>
      </div>

      {isPostGameView && (
        <Card className="post-game-prompt-card">
          <p>
            <Trans
              i18nKey="historyDetail.postGamePrompt"
              components={[
                <Link to="/history" className="history-link-inline" />,
              ]}
            />
          </p>
        </Card>
      )}

      <Card className="detail-summary-card">
        <div className="summary-item"><BrainCircuit size={18} /><strong>{t('history.nLevel')}:</strong> {session.settings.n_level}</div>
        <div className="summary-item"><Clock size={18} /><strong>{t('history.speed')}:</strong> {session.settings.speed_ms}ms</div>
        <div className="summary-item"><ListChecks size={18} /><strong>{t('history.sessionLength')}:</strong> {session.settings.session_length}</div>
      </Card>

      <Card className="stats-card">
        <div className="stats-column">
          <h3 className="stats-title"><Eye size={20} /> {t('history.visual')}</h3>
          <div className="stat-item"><span>{t('historyDetail.stats.hitRate')}:</span> <span>{visualStats.hitRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.missRate')}:</span> <span>{visualStats.missRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.faRate')}:</span> <span>{visualStats.falseAlarmRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.crRate')}:</span> <span>{visualStats.correctRejectionRate.toFixed(1)}%</span></div>
        </div>
        <div className="stats-column">
          <h3 className="stats-title"><Ear size={20} /> {t('history.audio')}</h3>
          <div className="stat-item"><span>{t('historyDetail.stats.hitRate')}:</span> <span>{audioStats.hitRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.missRate')}:</span> <span>{audioStats.missRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.faRate')}:</span> <span>{audioStats.falseAlarmRate.toFixed(1)}%</span></div>
          <div className="stat-item"><span>{t('historyDetail.stats.crRate')}:</span> <span>{audioStats.correctRejectionRate.toFixed(1)}%</span></div>
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
