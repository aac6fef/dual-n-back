import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  LineChart,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label,
} from 'recharts';
import {
  History as HistoryIcon,
  Sliders,
  ChevronRight,
  Target,
  AlertTriangle,
  Calendar,
  BrainCircuit,
} from 'lucide-react';
import Card from '../components/ui/Card';
import './HistoryPage.css';

// --- Data Structures mirroring Rust backend ---
interface AccuracyStats {
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
}

interface UserSettings {
  n_level: number;
  speed_ms: number;
  session_length: number;
}

// This is the SUMMARY object from the backend
interface GameSessionSummary {
  id: string;
  timestamp: string; // ISO 8601 string
  settings: UserSettings;
  visual_stats: AccuracyStats;
  audio_stats: AccuracyStats;
}

// --- Helper Functions ---
const calculateHitRate = (stats: AccuracyStats): number => {
  const totalMatches = stats.true_positives + stats.false_negatives;
  if (totalMatches === 0) return 100.0; // Perfect score if there were no matches to catch
  return (stats.true_positives / totalMatches) * 100;
};

const calculateFalseAlarmRate = (stats: AccuracyStats): number => {
  const totalNonMatches = stats.false_positives + stats.true_negatives;
  if (totalNonMatches === 0) return 0.0;
  return (stats.false_positives / totalNonMatches) * 100;
};

const transformHistoryData = (sessions: GameSessionSummary[]) => {
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

const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<GameSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const fetchedHistory = await invoke<GameSessionSummary[]>('get_game_history');
        // Sort by timestamp ascending for chart view
        const sortedForChart = [...fetchedHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setHistory(sortedForChart);
      } catch (error) {
        console.error("Failed to fetch game history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const chartData = transformHistoryData(history);
  const chartMinWidth = 700;
  const pointWidth = 30;
  const dynamicChartWidth = Math.max(chartMinWidth, chartData.length * pointWidth);

  const nLevelChangePoints = chartData.reduce((acc, session, index, arr) => {
    if (index > 0 && session.nLevel !== arr[index - 1].nLevel) {
      acc.push({ x: session.date, nLevel: session.nLevel });
    }
    return acc;
  }, [] as { x: string; nLevel: number }[]);

  // --- Custom X-axis Tick Formatter ---
  let lastDisplayedDate = '';
  const formatXAxis = (tickItem: string) => {
    if (tickItem !== lastDisplayedDate) {
      lastDisplayedDate = tickItem;
      return tickItem;
    }
    return '';
  };
  // We need to reset the `lastDisplayedDate` for each chart.
  // A bit of a hack, but Recharts doesn't have a built-in way to manage this across charts.
  const resetDateTracker = () => {
    lastDisplayedDate = '';
    return null;
  }

  const tooltipValueFormatter = (value: number | string, name: string) => {
    if (typeof value === 'number') {
      const roundedValue = value.toFixed(2);
      const unit = name.toLowerCase().includes('rate') ? '%' : '';
      return [`${roundedValue}${unit}`, name];
    }
    return [value, name];
  };


  if (isLoading) {
    return <div className="history-container"><h1 className="page-title">{t('history.loading')}</h1></div>;
  }

  if (history.length === 0) {
    return (
      <div className="history-container">
        <h1 className="page-title">{t('history.title')}</h1>
        <p>{t('history.noHistory')}</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      <h1 className="page-title">{t('history.title')}</h1>

      <div className="charts-grid">
        <div className="chart-wrapper">
          <div className="chart-header">
            <h2 className="page-subtitle">
              <Target size={22} />
              {t('history.hitRateChart')}
            </h2>
            <div className="custom-legend">
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: '#8884d8' }}></span>{t('history.visualHitRate')}</div>
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: '#82ca9d' }}></span>{t('history.audioHitRate')}</div>
            </div>
          </div>
          <div className="chart-container">
            <Card className="chart-card">
              {resetDateTracker()}
              <LineChart width={dynamicChartWidth} height={300} data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-color)" />
              <XAxis dataKey="date" stroke="var(--text-color)" interval={0} angle={-30} textAnchor="end" height={70} tickFormatter={formatXAxis} />
                <YAxis stroke="var(--text-color)" domain={[50, 100]} unit="%" />
                <Tooltip
                  formatter={tooltipValueFormatter}
                  contentStyle={{
                    backgroundColor: 'var(--sidebar-color)',
                    borderColor: 'var(--hover-color)',
                  }}
                />
                {nLevelChangePoints.map((p, i) => (
                  <ReferenceLine key={i} x={p.x} stroke="var(--accent-color)" strokeDasharray="3 3">
                    <Label value={`N=${p.nLevel}`} position="insideTopRight" fill="var(--accent-color)" fontSize={12} />
                  </ReferenceLine>
                ))}
                <Line type="monotone" dataKey="visualHitRate" name={t('history.visualHitRate')} stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} legendType="none" />
                <Line type="monotone" dataKey="audioHitRate" name={t('history.audioHitRate')} stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} legendType="none" />
              </LineChart>
            </Card>
          </div>
        </div>

        <div className="chart-wrapper">
          <div className="chart-header">
            <h2 className="page-subtitle">
              <AlertTriangle size={22} />
              {t('history.falseAlarmChart')}
            </h2>
            <div className="custom-legend">
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: '#ffc658' }}></span>{t('history.visualFaRate')}</div>
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: '#ff8042' }}></span>{t('history.audioFaRate')}</div>
            </div>
          </div>
          <div className="chart-container">
            <Card className="chart-card">
              {resetDateTracker()}
              <LineChart width={dynamicChartWidth} height={300} data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-color)" />
              <XAxis dataKey="date" stroke="var(--text-color)" interval={0} angle={-30} textAnchor="end" height={70} tickFormatter={formatXAxis} />
                <YAxis stroke="var(--text-color)" domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={tooltipValueFormatter}
                  contentStyle={{
                    backgroundColor: 'var(--sidebar-color)',
                    borderColor: 'var(--hover-color)',
                  }}
                />
                <Line type="monotone" dataKey="visualFalseAlarmRate" name={t('history.visualFaRate')} stroke="#ffc658" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} legendType="none" />
                <Line type="monotone" dataKey="audioFalseAlarmRate" name={t('history.audioFaRate')} stroke="#ff8042" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} legendType="none" />
              </LineChart>
            </Card>
          </div>
        </div>

        <div className="chart-wrapper">
          <div className="chart-header">
            <h2 className="page-subtitle">
              <Sliders size={22} />
              {t('history.difficultyProgression')}
            </h2>
            <div className="custom-legend">
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: '#ff79c6' }}></span>{t('history.nLevel')}</div>
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: '#bd93f9' }}></span>{t('history.sessionLength')}</div>
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: '#ffb86c' }}></span>{t('history.speed')}</div>
            </div>
          </div>
          <div className="chart-container">
            <Card className="chart-card">
              {resetDateTracker()}
              <ComposedChart width={dynamicChartWidth} height={300} data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-color)" />
              <XAxis dataKey="date" stroke="var(--text-color)" interval={0} angle={-30} textAnchor="end" height={70} tickFormatter={formatXAxis} />
                <YAxis yAxisId="left" label={{ value: 'N-Level / Length', angle: -90, position: 'insideLeft', fill: 'var(--text-color)' }} stroke="var(--text-color)" />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Speed (ms)', angle: 90, position: 'insideRight', fill: 'var(--text-color)' }} stroke="var(--text-color)" />
                <Tooltip
                  formatter={tooltipValueFormatter}
                  contentStyle={{
                    backgroundColor: 'var(--sidebar-color)',
                    borderColor: 'var(--hover-color)',
                  }}
                />
                <Bar yAxisId="left" dataKey="nLevel" name={t('history.nLevel')} fill="#ff79c6" legendType="none" />
                <Bar yAxisId="left" dataKey="sessionLength" name={t('history.sessionLength')} fill="#bd93f9" legendType="none" />
                <Line yAxisId="right" type="monotone" dataKey="speed" name={t('history.speed')} stroke="#ffb86c" legendType="none" />
              </ComposedChart>
            </Card>
          </div>
        </div>
      </div>

      <h2 className="page-subtitle">
        <HistoryIcon size={22} />
        {t('history.sessionHistory')}
      </h2>
      <div className="session-list">
        {chartData.slice().reverse().map((session) => (
          <Link to={`/history/${session.id}`} key={session.id} className="session-link">
            <Card className="session-card">
              <div className="session-summary">
                <div className="summary-item">
                  <Calendar size={18} />
                  <span>{session.date}</span>
                </div>
                <div className="summary-item">
                  <BrainCircuit size={18} />
                  <span>{t('history.nLevel')}: {session.nLevel}</span>
                </div>
              </div>
              <div className="session-scores">
                <div className="score-group">
                  <span className="score-label">{t('history.visual')}</span>
                  <div className="score-values">
                    <span className="score-value"><Target size={14} /> {session.visualHitRate.toFixed(1)}%</span>
                    <span className="score-value"><AlertTriangle size={14} /> {session.visualFalseAlarmRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="score-group">
                  <span className="score-label">{t('history.audio')}</span>
                  <div className="score-values">
                    <span className="score-value"><Target size={14} /> {session.audioHitRate.toFixed(1)}%</span>
                    <span className="score-value"><AlertTriangle size={14} /> {session.audioFalseAlarmRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="session-arrow" size={24} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;
