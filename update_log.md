# Update Log

[**中文更新日志 (Chinese Update Log)**](update_log_cn.md)
## v0.1.13
- **[Feature/System Integration]** The application now automatically detects the operating system's theme (light/dark) and applies it on launch.
- **[Feature]** Added a "Follow System Theme" toggle in the settings, allowing users to enable or disable this automatic theme synchronization.
- **[UI/UX]** When a user manually selects a theme, the "Follow System Theme" toggle is automatically disabled.
- **[UI/UX]** When the "Follow System Theme" toggle is re-enabled, the application theme immediately syncs with the current system theme.

## v0.1.12
- **[Feature/System Integration]** The application now automatically detects the operating system's language on first launch and sets it as the default.
- **[Feature]** Added a "Follow System Language" toggle in the settings, allowing users to enable or disable this behavior.
- **[UI/UX]** When a user manually selects a different language, the "Follow System Language" toggle is now automatically disabled.
- **[UI/UX]** When the "Follow System Language" toggle is re-enabled, the application language immediately syncs with the current system language without requiring a restart.
- **[Fix]** Resolved a series of state management bugs that required users to click twice to change language settings.

## v0.1.11
- **[Feature]** Added a back button to the history detail page for easy navigation.
- **[Feature]** Added an intelligent difficulty adjustment feature. The system will now prompt the user to increase or decrease the N-Back level based on their performance.
- **[Feature]** The intelligent difficulty adjustment feature can be enabled or disabled in the settings. The accuracy thresholds for triggering the suggestions are also configurable.
- **[Feature]** The difficulty adjustment prompt is now a confirmation dialog, allowing the user to accept or decline the suggestion.
- **[Refactor]** Changed the accuracy calculation metric from "Hit Rate" to a more comprehensive "Accuracy" score, which includes correct rejections. This new metric is now used across the app, including the game UI, history page, and difficulty adjustment logic.
- **[Fix]** Fixed a bug where the accuracy displayed on the game page was incorrect.
- **[UI/UX]** Completely redesigned the session cards on the history page to be fully responsive, ensuring proper display on all screen sizes from mobile to desktop.
- **[UI/UX]** Implemented a multi-stage responsive layout for session cards (2x2 grid for tablets, vertical stack for mobile) to optimize information density and readability.
- **[UI/UX]** Added `Eye` and `Ear` icons to the visual and audio score sections for better clarity.
- **[Fix]** Corrected an issue where text and icons in the session cards were not clearly visible in light mode.
- **[UI/UX]** Completely redesigned the keybinding settings interface for a more modern and intuitive user experience.
- **[UI/UX]** Replaced the full-screen key listener with a clear, user-friendly modal dialog for adding new keys.
- **[Fix]** Resolved an issue where UI elements were not clearly visible in light mode.
- **[Fix]** Prevented the "Escape" key from being accidentally registered as a keybinding when closing the modal.
- **[UI/UX]** Added icons to the "Position" and "Audio" keybinding sections for better clarity.

## v0.1.10
- **[Fix]** Addressed a series of rendering issues in the history charts:
  - Resolved chart crowding and the disappearance of N-level labels by ensuring even data point distribution.
  - Prevented duplicate date labels by intelligently ensuring each date appears only once on the chart.

## v0.1.9
- **[Feature]** Added highly customizable keybinding functionality, allowing users to assign custom keys for core actions.

## v0.1.8
- **[Feature]** Implemented in-game pause and safe exit mechanisms.
- **[Feature]** When a game is in progress, the system now automatically pauses and displays a confirmation dialog if the user attempts to navigate away, preventing accidental interruptions.
- **[UI/UX]** Moved the pause and exit buttons to the top of the game screen to optimize workflow and reduce accidental clicks.

## v0.1.7
- **[Fix]** Fixed a bug where client-side settings (like theme, language) were not reverting to their defaults when the application was reset.
- **[Feature/Accessibility]** Added a "Reduce Motion" option in settings to disable all UI animations, enhancing accessibility.
- **[UI/Animation]** Introduced comprehensive animations across the app to improve the overall user experience:
  - Added smooth fade-in transitions for page navigation.
  - Implemented a "pulsing" fade-in/out animation for the highlighted square in the game, synchronized with the game speed.
  - Enhanced button press feedback for a more tactile feel.
  - Added elegant hover animations to cards and stat components.

## v0.1.6
- **[UI/UX]** Made several minor UI tweaks to improve visual consistency.
- **[UI/UX]** Outfitted the settings page with new icons for better recognizability.
- **[Refactor]** Conducted a major refactoring of the frontend codebase, optimizing the project structure and maintainability.
- **[Feature]** Removed the "Save" button from the settings page; all settings are now auto-saved and take effect immediately.

## v0.1.5
- **[UI/UX]** Optimized the history page chart layout to a single-column view with vertical scrolling to accommodate more data.
- **[UI/UX]** Added horizontal scrolling to history charts and set a minimum width for data points to prevent crowding.
- **[UI/UX]** Redesigned chart legends as independent, responsive components above the charts to resolve issues with them being obscured or disappearing on scroll.
- **[UI/UX]** Fixed the Y-axis maximum of the "Hit Rate" and "False Alarm Rate" charts to 100 for easier trend comparison.
- **[UI/UX]** Standardized the number formatting in all chart tooltips to two decimal places.
- **[Refactor]** Refactored the history page's chart components to support dynamic widths and custom legends.

## v0.1.4
- **[Feature]** Completely overhauled the history module to provide more powerful data analysis capabilities.
- **[Feature]** Added long-term trend charts for hit rate and false alarm rate to the history page.
- **[Feature]** Implemented clickable session details pages for in-depth review.
- **[Feature]** Displayed a precise chronological sequence of visual and auditory stimuli on the details page.
- **[Feature]** On the details page, system-expected matches are highlighted with a border, and user keypresses are marked with an underline for intuitive review.
- **[Feature]** Added a legend for color blocks and their corresponding coordinates (0-8) on the details page, with clear text explanations.
- **[Feature]** Added detailed session statistics to the details page, including hit rate, miss rate, false alarm rate, and correct rejection rate.
- **[Refactor]** Refactored the backend data persistence structure to support more granular event logging.
- **[UI/UX]** Optimized the responsive design of the history list and details pages for various screen widths.
- **[UI/UX]** Improved the color contrast of numbers and underlines within the visual stimulus blocks on the details page for clarity.
- **[Fix]** Fixed a critical bug that prevented the game page from functioning correctly after the backend refactor.

## v0.1.3
- **[Feature]** Added developer options, including the ability to set ultra-short stimulus intervals and generate fake history data for testing.
- **[Feature]** Added an "Reset Application" feature to clear all history and user settings with one click.
- **[Refactor]** Removed the "Visual Feedback" option from settings to simplify configuration.
- **[Refactor]** Hardcoded the grid size to 3x3 and removed the corresponding option from settings to standardize the training protocol.
- **[UI/UX]** Adjusted the spacing of data management buttons on the settings page.
- **[Fix]** Fixed an issue where generating fake history data could cause the UI to freeze.

## v0.1.2
- **[Feature]** When a user misses a match, an animated red error icon is now displayed as instant feedback.
- **[Fix]** Fixed an issue where component icons were not colored correctly in dark mode.

## v0.1.1
- **[Fix]** Fixed a bug that caused no sound on Android (by converting audio files from .aiff to .wav).
- **[Fix]** Fixed a bug where not all user settings were loaded on game start.
- **[UI/UX]** Improved the real-time data display panel on the game screen.
- **[Audio]** Adopted more standard and natural-sounding letter recordings to improve the clarity of auditory stimuli.

## Roadmap

### Feature Enhancements
- **System Integration**: Automatically sync with the operating system's language and theme (dark/light) settings.

### UI/UX Improvements
- **Response Latency**: Address the minor delay in button responsiveness to improve the tactile feel.
- **Mobile Layout**: Fix the issue where an empty space occasionally appears at the bottom of the mobile view when scrolling.
- **History Cards**: Redesign the summary cards on the history page to optimize their layout and information density.

### Core Algorithm
- **New Algorithm Implementation**: Develop and integrate a more scientifically robust training algorithm to replace the current basic implementation.
- **Data Analysis**: Introduce an analysis model based on cognitive theory to detect whether a user is guessing during training sessions.
