# 核心游戏逻辑 (Rust 后端) - 详细子任务

这个阶段的目标是构建驱动整个 Dual N-Back 游戏的核心引擎。它不关心用户界面，只负责处理游戏的状态、规则和数据。

### **任务 3.1: 定义核心数据结构**

这是构建游戏逻辑的基石。清晰的数据结构能让后续的开发事半功倍。

*   **子任务 3.1.1: 定义刺激类型 (`Stimulus`)**
    *   创建一个枚举（`enum`）`Stimulus`，用于表示游戏中的两种基本刺激。
    *   `Visual(u8)`: 代表视觉刺激，`u8` 类型的值可以表示 3x3 网格中的位置（例如 0-8）。
    *   `Audio(char)`: 代表听觉刺激，`char` 类型的值可以表示字母（例如 'A'-'Z'）。

*   **子任务 3.1.2: 定义游戏回合 (`GameTurn`)**
    *   创建一个结构体（`struct`）`GameTurn`，用于封装每一回合呈现给用户的完整刺激信息。
    *   包含字段：`visual: u8` 和 `audio: char`。这将确保每一轮的视觉和听觉刺激被成对记录。

*   **子任务 3.1.3: 定义游戏状态 (`GameState`)**
    *   创建核心的 `GameState` 结构体，它将管理整个游戏的生命周期。
    *   包含字段：
        *   `n_level: usize`: 当前的 N-back 等级。
        *   `speed_ms: u64`: 刺激呈现的速度（毫秒）。
        *   `is_running: bool`: 游戏是否正在进行。
        *   `turn_history: Vec<GameTurn>`: 记录所有已经发生过的回合。
        *   `current_turn_index: usize`: 当前是第几回合。
        *   `score: i32`: 当前得分。

### **任务 3.2: 实现刺激生成器**

这部分负责按规则随机生成游戏内容。

*   **子任务 3.2.1: 实现随机位置生成器**
    *   创建一个私有函数 `fn generate_random_position() -> u8`。
    *   该函数使用 `rand` crate 从预设的范围（例如 0 到 8）中返回一个随机整数。

*   **子任务 3.2.2: 实现随机字母生成器**
    *   创建一个私有函数 `fn generate_random_letter() -> char`。
    *   该函数使用 `rand` crate 从 'A' 到 'Z' 的范围内返回一个随机字符。

*   **子任务 3.2.3: 实现回合生成逻辑**
    *   创建一个方法 `fn generate_new_turn(&mut self)`。
    *   此方法调用上述两个生成器，创建一个新的 `GameTurn` 实例，并将其添加到 `GameState` 的 `turn_history` 中。

### **任务 3.3: 实现核心匹配算法**

这是游戏最关键的逻辑，用于判断用户的输入是否正确。

*   **子任务 3.3.1: 定义用户输入结构 (`UserInput`)**
    *   创建一个结构体 `UserInput`，用于从前端接收用户的判断。
    *   包含字段：`position_match: bool` 和 `audio_match: bool`。`true` 表示用户认为当前刺激与 N-back 前的刺激匹配。

*   **子任务 3.3.2: 实现匹配检查函数**
    *   在 `GameState` 的 `impl` 块中，创建一个核心方法 `fn check_match(&self, user_input: UserInput) -> (bool, bool)`。
    *   **前提条件检查**: 确保 `current_turn_index >= n_level`，因为在此之前不可能有匹配。
    *   **获取历史刺激**: 获取 `n_level` 之前的回合数据 `let target_turn = &self.turn_history[self.current_turn_index - self.n_level];`。
    *   **判断视觉匹配**:
        *   计算实际是否匹配：`let actual_pos_match = self.turn_history.last().unwrap().visual == target_turn.visual;`
        *   判断用户决策是否正确：`let is_pos_decision_correct = user_input.position_match == actual_pos_match;`
    *   **判断听觉匹配**:
        *   计算实际是否匹配：`let actual_audio_match = self.turn_history.last().unwrap().audio == target_turn.audio;`
        *   判断用户决策是否正确：`let is_audio_decision_correct = user_input.audio_match == actual_audio_match;`
    *   **返回结果**: 返回一个元组 `(is_pos_decision_correct, is_audio_decision_correct)`。

### **任务 3.4: 实现游戏流程控制**

这部分负责将所有逻辑串联起来，形成完整的游戏流程。

*   **子任务 3.4.1: 实现得分更新逻辑**
    *   创建一个方法 `fn update_score(&mut self, match_result: (bool, bool))`。
    *   根据 `check_match` 返回的结果更新 `GameState` 中的 `score` 字段。例如，每个正确的判断加 10 分，错误的减 5 分。

*   **子任务 3.4.2: 实现游戏主循环/滴答 (`tick`)**
    *   创建一个 `fn tick(&mut self)` 方法，它代表游戏向前推进一个时间步。
    *   此方法将：
        1.  调用 `generate_new_turn` 生成并添加新的回合。
        2.  增加 `current_turn_index`。
        3.  （此阶段暂时不处理用户输入，输入处理将在 `command` 中完成）。

*   **子任务 3.5: 状态管理与线程安全**
    *   **目标**: 由于 Tauri 的 `command` 会在不同线程上调用 Rust 代码，游戏状态必须是线程安全的。
    *   **实现**:
        1.  将整个 `GameState` 包装在 `std::sync::Mutex` 中，即 `Mutex<GameState>`。
        2.  创建一个类型别名 `type AppState = Mutex<GameState>` 以方便使用。
        3.  在 `main.rs` 中，使用 Tauri 的 `manage` 函数将这个 `AppState` 注册为全局状态。
