# Dual N-Back Frontend Documentation

This document provides a detailed overview of the frontend architecture, components, and logic for the Dual N-Back application.

## 1. Project Structure

The frontend code is primarily located in the `src` directory.

-   **`public/`**: Contains static assets that are served directly, such as fonts, images, and the crucial letter sounds (`/sounds`).
-   **`src/`**: The main directory for all frontend source code.
    -   **`assets/`**: Static assets that are processed by Vite, such as SVGs.
    -   **`components/`**: Reusable React components.
        -   **`ui/`**: A library of generic, reusable UI components like `Button`, `Card`, `Switch`, and the new `Stat` component.
        -   Other components are more specific to certain pages, like `GameControls` or `Grid`.
    -   **`contexts/`**: Contains React Context providers for global state management.
        -   `SettingsContext.tsx`: Manages all user settings (game difficulty, theme, language) and provides them to the entire application.
    -   **`hooks/`**: Custom React hooks.
        -   `useLocalStorage.ts`: A hook for persisting state to the browser's local storage.
    -   **`locales/`**: Contains JSON files for internationalization (i18n), supporting English and Chinese.
    -   **`pages/`**: Each file represents a major view or "page" in the application, corresponding to a route.
    -   **`styles/`**: (Currently empty) Intended for global styles beyond what's in `App.css`.
    -   **`utils/`**: Utility functions that are not tied to any specific component.
        -   `stats.ts`: Contains helper functions for calculating game statistics and transforming data for the history charts.
    -   **`App.tsx`**: The root component of the application, which sets up routing.
    -   **`main.tsx`**: The entry point of the React application.
-   **`src-tauri/`**: Contains the Rust backend code. The frontend communicates with this backend via Tauri's `invoke` API.

## 2. Component Library (`src/components/ui`)

The application uses a set of reusable UI components to maintain a consistent look and feel.

-   **`Button.tsx`**: A versatile button component with different variants (`primary`, `secondary`, `danger`) and support for loading states and icons.
-   **`Card.tsx`**: A simple container component with a consistent border and background, used to group related content.
-   **`Stat.tsx`**: A component designed to display a single statistic with an icon, a label, and a value. Used on the pre-game screen and the history details page.
-   **`Switch.tsx`**: A toggle switch component.

## 3. State Management (`SettingsContext`)

Global application state is managed through `SettingsContext.tsx`.

-   **Purpose**: To provide access to user settings across all components without "prop drilling".
-   **State Managed**:
    -   Game settings (`n_level`, `speed_ms`, `session_length`).
    -   Client-side settings (`theme`, `language`, `allowFastSpeed`).
-   **Functionality**:
    -   Loads settings from the Rust backend and local storage on startup.
    -   Provides a `saveSettings` function to persist changes.
    -   Applies the theme (`.light-theme`) to the root `<html>` element, allowing for global CSS variable-based theming.
    -   Changes the application language using `i18next`.

## 4. Routing (`App.tsx`)

Routing is handled by `react-router-dom` using `HashRouter`.

-   **`Layout.tsx`**: A primary layout component that includes the sidebar navigation and a main content area (`<Outlet />`).
-   **Routes**:
    -   `/`: The main game page (`GamePage.tsx`).
    -   `/settings`: The settings page (`SettingsPage.tsx`).
    -   `/history`: The main history page with charts and a list of sessions (`HistoryPage.tsx`).
    -   `/history/:sessionId`: The detail view for a specific past session (`HistoryDetailPage.tsx`).
    -   `/results/:sessionId`: The post-game summary page, which reuses the `HistoryDetailPage.tsx` component.

## 5. Core Logic

### Game Loop (`GamePage.tsx`)

The core game logic is managed by a `useEffect` hook in `GamePage.tsx`.

1.  **Start**: The loop starts when `gameState.isRunning` is `true`.
2.  **Timer**: A `setTimeout` is created with a duration equal to `gameSpeed`.
3.  **User Input**: During this time, the user can provide input via the `GameControls`.
4.  **End of Turn**: When the timer fires:
    -   The user's input for the turn is sent to the Rust backend via `invoke('submit_user_input')`.
    -   The frontend immediately requests the next game state via `invoke('get_game_state')`.
5.  **Next State**:
    -   If the new state has `isRunning: true`, the `gameState` is updated, triggering the `useEffect` again for the next turn.
    -   If the new state has `isRunning: false`, the game is over.
6.  **Game Over Flow**:
    -   The component enters a "transitioning" state to prevent the UI from flashing back to the main menu.
    -   It fetches the full game history to find the ID of the session that just finished.
    -   It then navigates to the `/results/:sessionId` page.

### Statistics (`utils/stats.ts`)

All calculations for hit rates, false alarm rates, and other statistics are centralized in `src/utils/stats.ts`. This ensures that the logic is consistent between the history page and the detail page.

## 6. Styling

-   **CSS Variables**: The application uses a CSS variable-based theming system defined in `App.css`. The `:root` selector defines the default (dark theme) variables, and the `.light-theme` class overrides these for the light theme.
-   **Component Styles**: Each component has its own corresponding `.css` file, promoting modularity.
-   **Scoped Styles**: To prevent styles from leaking between components, selectors are made specific where necessary (e.g., `.stats-column .stat-item` instead of just `.stat-item`).
