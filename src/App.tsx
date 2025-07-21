import { HashRouter, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "./contexts/SettingsContext";
import { GameStatusProvider } from "./contexts/GameStatusContext";
import { PauseProvider } from "./contexts/PauseContext";
import Layout from "./components/Layout"; // Import the new Layout component
import GamePage from "./pages/GamePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";
import HistoryDetailPage from "./pages/HistoryDetailPage";
import "./App.css";

function App() {
  return (
    <SettingsProvider>
      <GameStatusProvider>
        <PauseProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
            <Route index element={<GamePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="history/:sessionId" element={<HistoryDetailPage />} />
            <Route path="results/:sessionId" element={<HistoryDetailPage />} />
              </Route>
            </Routes>
          </HashRouter>
        </PauseProvider>
      </GameStatusProvider>
    </SettingsProvider>
  );
}

export default App;
