import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts';
import { BarChart3, History as HistoryIcon, Sliders, ChevronRight } from 'lucide-react';
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
  grid_size: number;
  session_length: number;
}

interface GameSession {
  id: string;
  timestamp: string; // ISO 8601 string
  settings: UserSettings;
  visual_stats: AccuracyStats;
  audio_stats: AccuracyStats;
}

// --- Helper Functions ---
const calculateAccuracy = (stats: AccuracyStats): number => {
  const total = stats.true_positives + stats.true_negatives + stats.false_positives + stats.false_negatives;
  if (total === 0) return 0;
  const correct = stats.true_positives + stats.true_negatives;
  return (correct / total) * 100;
};

const transformHistoryData = (sessions: GameSession[]) => {
  return sessions.map(session => ({
    date: new Date(session.timestamp).toLocaleDateString(),
    nLevel: session.settings.n_level,
    speed: session.settings.speed_ms,
    sessionLength: session.settings.session_length,
    visualAcc: calculateAccuracy(session.visual_stats),
    audioAcc: calculateAccuracy(session.audio_stats),
  }));
};

const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const fetchedHistory = await invoke<GameSession[]>('get_game_history');
        // Sort by timestamp ascending for chart
        fetchedHistory.sort((a: GameSession, b: GameSession) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setHistory(fetchedHistory);
      } catch (error) {
        console.error("Failed to fetch game history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const chartData = transformHistoryData(history);

  const nLevelChangePoints = chartData.reduce((acc, session, index, arr) => {
    if (index > 0 && session.nLevel !== arr[index - 1].nLevel) {
      acc.push({ x: session.date, nLevel: session.nLevel });
    }
    return acc;
  }, [] as { x: string; nLevel: number }[]);

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

      <h2 className="page-subtitle">
        <BarChart3 size={22} />
        {t('history.progressChart')}
      </h2>
      <Card className="chart-card">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-color)" />
            <XAxis dataKey="date" stroke="var(--text-color)" />
            <YAxis stroke="var(--text-color)" domain={[50, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--sidebar-color)',
                borderColor: 'var(--hover-color)',
              }}
            />
            <Legend />
            {nLevelChangePoints.map((p, i) => (
              <ReferenceLine
                key={i}
                x={p.x}
                stroke="var(--accent-color)"
                strokeDasharray="3 3"
              >
                <Label value={`N=${p.nLevel}`} position="insideTopRight" fill="var(--accent-color)" fontSize={12} />
              </ReferenceLine>
            ))}
            <Line
              type="monotone"
              dataKey="visualAcc"
              name={t('history.visualAccuracy')}
              stroke="#8884d8"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="audioAcc"
              name={t('history.audioAccuracy')}
              stroke="#82ca9d"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <h2 className="page-subtitle">
        <Sliders size={22} />
        {t('history.difficultySettings')}
      </h2>
      <Card className="chart-card">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hover-color)" />
            <XAxis dataKey="date" stroke="var(--text-color)" />
            <YAxis yAxisId="left" label={{ value: 'N-Level / Length', angle: -90, position: 'insideLeft', fill: 'var(--text-color)' }} stroke="var(--text-color)" />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Speed (ms)', angle: 90, position: 'insideRight', fill: 'var(--text-color)' }} stroke="var(--text-color)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--sidebar-color)',
                borderColor: 'var(--hover-color)',
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="nLevel" name={t('history.nLevel')} fill="#ff79c6" />
            <Bar yAxisId="left" dataKey="sessionLength" name={t('history.sessionLength')} fill="#bd93f9" />
            <Line yAxisId="right" type="monotone" dataKey="speed" name={t('history.speed')} stroke="#ffb86c" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <h2 className="page-subtitle">
        <HistoryIcon size={22} />
        {t('history.sessionHistory')}
      </h2>
      <div className="session-list">
        {chartData.slice().reverse().map((session, index) => (
          <Card key={index} className="session-card">
            <div className="session-info">
              <span className="session-date">{session.date}</span>
              <span className="session-nlevel">N-Level: {session.nLevel}</span>
            </div>
            <div className="session-scores">
              <span>V: {session.visualAcc.toFixed(1)}%</span>
              <span>A: {session.audioAcc.toFixed(1)}%</span>
            </div>
            <ChevronRight className="session-arrow" size={24} />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;
