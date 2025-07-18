# N-Back App Design System

This document outlines the design system for the N-Back application to ensure a consistent and cohesive user experience.

## 1. Color Palette

The application uses a dark theme inspired by popular code editors.

| Role                 | Variable Name          | Hex Code  | Description                               |
| -------------------- | ---------------------- | --------- | ----------------------------------------- |
| Main Background      | `--background-color`   | `#1a1b26` | The darkest color, used for the main view |
| Sidebar/UI Elements  | `--sidebar-color`      | `#24283b` | A slightly lighter shade for containers   |
| Text & Icons         | `--text-color`         | `#c0caf5` | Main text color, soft and readable        |
| Hover/Subtle Borders | `--hover-color`        | `#414868` | Used for hover states and subtle borders  |
| Accent/Primary       | `--accent-color`       | `#7aa2f7` | The primary color for buttons, highlights |

## 2. Typography

-   **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` (System Font Stack)
-   **Body Text**: `16px`, `var(--text-color)`
-   **Headings (`h1`, `h2`...):**
    -   `h1`: `2rem`, bold
    -   `h2`: `1.5rem`, bold
-   **Weights**: `400` (Regular), `500` (Medium), `600` (Semi-bold), `700` (Bold)

## 3. Iconography

-   **Library**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)
-   **Standard Size**: `20px` for navigation, `24px` for status icons.
-   **Color**: `var(--text-color)` for standard icons, `var(--accent-color)` for highlighted icons.

## 4. Components

### Button (`Button.tsx`)

-   **Base Style (`.btn`)**:
    -   `padding`: `0.8rem 1.5rem`
    -   `border-radius`: `8px`
    -   `font-weight`: `600`
-   **Primary Variant (`.btn-primary`)**:
    -   `background-color`: `var(--accent-color)`
    -   `color`: `var(--background-color)`
-   **Secondary Variant (`.btn-secondary`)**:
    -   `background-color`: `var(--hover-color)`
    -   `color`: `var(--text-color)`

### Grid (`Grid.tsx`)

-   **Container (`.grid-container`)**:
    -   `gap`: `10px`
    -   `border`: `2px solid var(--hover-color)`
-   **Cell (`.grid-cell`)**:
    -   `background-color`: `var(--sidebar-color)`
-   **Active Cell (`.grid-cell.active`)**:
    -   `background-color`: `var(--accent-color)`
    -   `box-shadow`: `0 0 15px var(--accent-color)`

### Game Status (`GameStatus.tsx`)

-   **Container (`.game-status-container`)**:
    -   `background-color`: `var(--sidebar-color)`
    -   `padding`: `1rem`
    -   `max-width`: `400px`

---
*This document should be updated as new components are created or existing ones are modified.*
