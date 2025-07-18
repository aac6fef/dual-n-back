import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
} from "react-router-dom";
import { Home, Settings, History } from "lucide-react";
import "./App.css";
import GamePage from "./pages/GamePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";

const Layout = () => {
  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : "";

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>N-Back</h2>
        </div>
        <ul className="nav-links">
          <li>
            <NavLink to="/" className={getLinkClass}>
              <Home size={20} />
              <span>Game</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={getLinkClass}>
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/history" className={getLinkClass}>
              <History size={20} />
              <span>History</span>
            </NavLink>
          </li>
        </ul>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<GamePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
