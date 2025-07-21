import React, { useState, useEffect, useMemo } from 'react';
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
import { GameSessionSummary, transformHistoryData } from '../utils/stats';
import { useSettings } from '../contexts/SettingsContext';
import './HistoryPage.css';

// A simple hook to get CSS variable values that updates with the theme
const useThemeColors = () => {
  const { settings } = useSettings();
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    // This function is redefined and called whenever the theme changes
    const style = getComputedStyle(document.documentElement);
    setColors({
      textColor: style.getPropertyValue('--text-color').trim(),
      hoverColor: style.getPropertyValue('--hover-color').trim(),
      accentColor: style.getPropertyValue('--accent-color').trim(),
      sidebarColor: style.getPropertyValue('--sidebar-color').trim(),
      // Chart-specific colors from CSS variables
      line1: style.getPropertyValue('--chart-line-1').trim(),
      line2: style.getPropertyValue('--chart-line-2').trim(),
      line3: style.getPropertyValue('--chart-line-3').trim(),
      line4: style.getPropertyValue('--chart-line-4').trim(),
      bar1: style.getPropertyValue('--chart-bar-1').trim(),
      bar2: style.getPropertyValue('--chart-bar-2').trim(),
      bar3: style.getPropertyValue('--chart-bar-3').trim(),
    });
  }, [settings.theme]); // Dependency on theme ensures this runs on change

  return colors;
};


const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<GameSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const themeColors = useThemeColors();

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const fetchedHistory = await invoke<GameSessionSummary[]>('get_game_history');
        setHistory(fetchedHistory);
      } catch (error) {
        console.error("Failed to fetch game history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [history]);

  const chartData = useMemo(() => transformHistoryData(sortedHistory), [sortedHistory]);

  const nLevelChangePoints = useMemo(() => {
    return chartData.reduce((acc, session, index, arr) => {
      if (index > 0 && session.nLevel !== arr[index - 1].nLevel) {
        acc.push({ x: session.date, nLevel: session.nLevel });
      }
      return acc;
    }, [] as { x: string; nLevel: number }[]);
  }, [chartData]);

  const chartMinWidth = 700;
  const pointWidth = 30;
  const dynamicChartWidth = Math.max(chartMinWidth, chartData.length * pointWidth);

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
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: themeColors.line1 }}></span>{t('history.visualHitRate')}</div>
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: themeColors.line2 }}></span>{t('history.audioHitRate')}</div>
            </div>
          </div>
          <div className="chart-container">
            <Card className="chart-card">
              <LineChart width={dynamicChartWidth} height={300} data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.hoverColor} />
                <XAxis dataKey="date" stroke={themeColors.textColor} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke={themeColors.textColor} domain={[50, 100]} unit="%" />
                <Tooltip
                  formatter={tooltipValueFormatter}
                  contentStyle={{
                    backgroundColor: themeColors.sidebarColor,
                    borderColor: themeColors.hoverColor,
                  }}
                />
                {nLevelChangePoints.map((p, i) => (
                  <ReferenceLine key={i} x={p.x} stroke={themeColors.accentColor} strokeDasharray="3 3">
                    <Label value={`N=${p.nLevel}`} position="insideTopRight" fill={themeColors.accentColor} fontSize={12} />
                  </ReferenceLine>
                ))}
                <Line type="monotone" dataKey="visualHitRate" name={t('history.visualHitRate')} stroke={themeColors.line1} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} legendType="none" />
                <Line type="monotone" dataKey="audioHitRate" name={t('history.audioHitRate')} stroke={themeColors.line2} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} legendType="none" />
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
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: themeColors.line3 }}></span>{t('history.visualFaRate')}</div>
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: themeColors.line4 }}></span>{t('history.audioFaRate')}</div>
            </div>
          </div>
          <div className="chart-container">
            <Card className="chart-card">
              <LineChart width={dynamicChartWidth} height={300} data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.hoverColor} />
                <XAxis dataKey="date" stroke={themeColors.textColor} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke={themeColors.textColor} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={tooltipValueFormatter}
                  contentStyle={{
                    backgroundColor: themeColors.sidebarColor,
                    borderColor: themeColors.hoverColor,
                  }}
                />
                <Line type="monotone" dataKey="visualFalseAlarmRate" name={t('history.visualFaRate')} stroke={themeColors.line3} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} legendType="none" />
                <Line type="monotone" dataKey="audioFalseAlarmRate" name={t('history.audioFaRate')} stroke={themeColors.line4} strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} legendType="none" />
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
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: themeColors.bar1 }}></span>{t('history.nLevel')}</div>
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: themeColors.bar2 }}></span>{t('history.sessionLength')}</div>
              <div className="legend-item"><span className="legend-color-box" style={{ backgroundColor: themeColors.bar3 }}></span>{t('history.speed')}</div>
            </div>
          </div>
          <div className="chart-container">
            <Card className="chart-card">
              <ComposedChart width={dynamicChartWidth} height={300} data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.hoverColor} />
                <XAxis dataKey="date" stroke={themeColors.textColor} angle={-30} textAnchor="end" height={50} />
                <YAxis yAxisId="left" label={{ value: 'N-Level / Length', angle: -90, position: 'insideLeft', fill: themeColors.textColor }} stroke={themeColors.textColor} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Speed (ms)', angle: 90, position: 'insideRight', fill: themeColors.textColor }} stroke={themeColors.textColor} />
                <Tooltip
                  formatter={tooltipValueFormatter}
                  contentStyle={{
                    backgroundColor: themeColors.sidebarColor,
                    borderColor: themeColors.hoverColor,
                  }}
                />
                <Bar yAxisId="left" dataKey="nLevel" name={t('history.nLevel')} fill={themeColors.bar1} legendType="none" />
                <Bar yAxisId="left" dataKey="sessionLength" name={t('history.sessionLength')} fill={themeColors.bar2} legendType="none" />
                <Line yAxisId="right" type="monotone" dataKey="speed" name={t('history.speed')} stroke={themeColors.bar3} legendType="none" />
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
