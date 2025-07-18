# Dual N-Back 项目开发文档

**最后更新**: 2025-07-19

## 1. 项目概览

本项目是一个使用 Tauri (v2) 框架开发的跨平台 Dual N-Back 桌面应用。应用旨在通过 Dual N-Back 任务训练用户的工作记忆，并提供详细的表现追踪。

-   **项目名称**: `nback-app`
-   **项目标识符**: `com.aac6fef.nback-app`

## 2. 技术栈

-   **核心框架**: [Tauri](https://tauri.app/) (v2)
-   **后端语言**: [Rust](https://www.rust-lang.org/)
-   **前端语言**: [TypeScript](https://www.typescriptlang.org/)
-   **前端框架**: [React](https://react.dev/) (v18)
-   **数据库**: [Sled](https://sled.rs/) (嵌入式数据库)
-   **包管理器**: [npm](https://www.npmjs.com/)
-   **构建工具**: [Vite](https://vitejs.dev/)

---

## 3. 开发者指南

本部分为接手此项目的开发者提供指引。

### 3.1. 环境要求

-   Rust: `^1.70`
-   Node.js: `^18.0`
-   Tauri CLI: `^2.0`

### 3.2. 后端开发命令

所有命令均在 `src-tauri/` 目录下执行。

-   **检查代码 (Check)**: `cargo check`
    *   快速检查代码语法和类型错误，不生成可执行文件。
-   **编译 (Build)**: `cargo build`
    *   编译整个 Rust 后端库。
-   **运行测试 (Test)**: `cargo test`
    *   执行所有单元测试，确保核心逻辑的正确性。

### 3.3. 项目结构

```
nback-app/
├── src/                  # 前端代码 (React)
├── src-tauri/            # 后端代码 (Rust)
│   ├── Cargo.toml        # Rust 依赖管理
│   ├── icons/
│   ├── sounds/
│   ├── src/
│   │   ├── game.rs       # 核心游戏逻辑与状态机
│   │   ├── persistence.rs# 数据持久化 (数据库交互)
│   │   ├── sequence_generator.rs # 刺激序列生成算法
│   │   ├── lib.rs        # Rust 库入口 (Tauri 命令定义)
│   │   └── main.rs       # Rust 二进制入口 (启动 Tauri)
│   └── tauri.conf.json
└── package.json
```

---

## 4. 后端架构详解

后端采用模块化设计，将游戏逻辑、序列生成、数据持久化和 API 接口清晰地分离开来。

### 4.1. 核心游戏流程 (Game Loop)

游戏的核心流程由前端的用户操作和后端的 `GameState` 状态机驱动，通过 Tauri 命令进行通信。

1.  **启动游戏 (`start_game`)**:
    *   **触发**: 用户在 UI 点击“开始游戏”。
    *   **后端行为**:
        1.  从数据库加载最新的 `UserSettings`。
        2.  调用 `sequence_generator`，根据设置（n, length, grid_size）**预生成整个会话**的听觉和视觉刺激序列。
        3.  创建一个全新的 `GameState` 实例，包含生成的序列。
        4.  将 `is_running` 设为 `true`。
        5.  执行第一次 `tick()`，将序列中的第一个刺激（Turn 0）加载到 `turn_history` 中。
    *   **前端行为**: 调用 `get_game_state` 获取 Turn 0 的刺激，并将其显示在 UI 上。

2.  **用户响应 (`submit_user_input`)**:
    *   **触发**: 用户对当前回合的刺激做出判断（点击“听觉匹配”或“视觉匹配”按钮）。
    *   **后端行为**:
        1.  调用 `GameState.process_input()`，传入用户的输入。此函数会：
            *   将用户的判断与 `n` 回合前的真实情况进行比较。
            *   更新 `visual_stats` 和 `audio_stats` 中的统计数据（命中、漏报等）。
            *   将 `current_turn_index` 加一，指向下一个回合。
        2.  调用 `GameState.tick()`，将下一个（Turn 1）刺激加载到 `turn_history` 中。
        3.  `tick()` 内部会检查 `current_turn_index` 是否已达到 `session_length`。如果达到，则将 `is_running` 设为 `false`。
        4.  如果 `is_running` 变为 `false`，则游戏结束。后端会创建一个 `GameSession` 对象，包含本次游戏的所有数据（设置、历史、统计），并将其存入数据库。
    *   **前端行为**: 再次调用 `get_game_state` 获取 Turn 1 的刺激，更新 UI，循环此过程。

### 4.2. 序列生成 (`sequence_generator.rs`)

为了确保训练的有效性，刺激序列的生成并非完全随机，而是遵循特定规则。

-   **匹配率控制**: 算法的目标是将每种刺激的匹配率控制在 **16.7% (1/6)** 到 **25% (1/4)** 之间，目标值为 **20% (1/5)**。
-   **避免重叠**: 在生成视觉序列时，算法会尽力避免在听觉序列已产生匹配的位置上创建视觉匹配，以降低双重匹配的概率。
-   **预生成**: 整个游戏会话的完整刺激序列在游戏开始时一次性生成。

### 4.3. 数据模型

#### `UserSettings`
```rust
pub struct UserSettings {
    pub n_level: usize,
    pub speed_ms: u64,
    pub grid_size: u8,
    pub session_length: usize, // 必须 >= 20
}
```

#### `GameSession`
```rust
pub struct GameSession {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub settings: UserSettings,
    pub turn_history: Vec<GameTurn>,
    pub visual_stats: AccuracyStats,
    pub audio_stats: AccuracyStats,
}
```

#### `AccuracyStats`
```rust
pub struct AccuracyStats {
    pub true_positives: u32,  // 命中
    pub true_negatives: u32,  // 正确拒绝
    pub false_positives: u32, // 虚警
    pub false_negatives: u32, // 漏报
}
```

### 4.4. Tauri 命令 (API 接口)

#### 设置相关

-   **`load_user_settings() -> Result<UserSettings, String>`**
-   **`save_user_settings(settings: UserSettings) -> Result<(), String>`**
    *   **Payload 示例**: `invoke('save_user_settings', { settings: { n_level: 3, speed_ms: 2000, grid_size: 3, session_length: 25 } })`

#### 游戏历史相关

-   **`get_game_history() -> Result<Vec<GameSession>, String>`**

#### 核心游戏流程相关

-   **`start_game()`**
-   **`submit_user_input(user_input: UserInput)`**
    *   **Payload 示例**: `invoke('submit_user_input', { userInput: { position_match: true, audio_match: false } })`
-   **`get_game_state() -> GameState`**
