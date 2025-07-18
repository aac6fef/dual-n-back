import React from 'react';
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

// Mock data for demonstration
const mockHistory = [
  { date: '2025-07-18', nLevel: 2, speed: 2000, sessionLength: 25, visualAcc: 85.2, audioAcc: 88.0 },
  { date: '2025-07-17', nLevel: 2, speed: 2000, sessionLength: 20, visualAcc: 82.1, audioAcc: 85.5 },
  { date: '2025-07-16', nLevel: 2, speed: 2500, sessionLength: 20, visualAcc: 78.0, audioAcc: 80.0 },
  { date: '2025-07-15', nLevel: 1, speed: 2500, sessionLength: 20, visualAcc: 95.5, audioAcc: 98.0 },
  { date: '2025-07-14', nLevel: 1, speed: 3000, sessionLength: 20, visualAcc: 92.3, audioAcc: 94.5 },
  { date: '2025-07-13', nLevel: 1, speed: 3000, sessionLength: 20, visualAcc: 90.0, audioAcc: 91.0 },
].reverse(); // Reverse to show oldest first in the chart

const HistoryPage: React.FC = () => {
  // Find points where N-Level changes to draw reference lines
  const nLevelChangePoints = mockHistory.reduce((acc, session, index, arr) => {
    if (index > 0 && session.nLevel !== arr[index - 1].nLevel) {
      acc.push({ x: session.date, nLevel: session.nLevel });
    }
    return acc;
  }, [] as { x: string; nLevel: number }[]);

  return (
    <div className="history-container">
      <h1 className="page-title">History & Progress</h1>

      <h2 className="page-subtitle">
        <BarChart3 size={22} />
        Progress Chart
      </h2>
      <Card className="chart-card">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockHistory}>
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
              name="Visual Accuracy"
              stroke="#8884d8"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="audioAcc"
              name="Audio Accuracy"
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
        Difficulty Settings
      </h2>
      <Card className="chart-card">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={mockHistory}>
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
            <Bar yAxisId="left" dataKey="nLevel" name="N-Level" fill="#ff79c6" />
            <Bar yAxisId="left" dataKey="sessionLength" name="Session Length" fill="#bd93f9" />
            <Line yAxisId="right" type="monotone" dataKey="speed" name="Speed" stroke="#ffb86c" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <h2 className="page-subtitle">
        <HistoryIcon size={22} />
        Session History
      </h2>
      <div className="session-list">
        {mockHistory.slice().reverse().map((session, index) => (
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
