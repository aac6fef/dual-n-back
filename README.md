# Dual N-Back: Advanced Cognitive Training Application

![Version](https://img.shields.io/badge/version-0.1.8-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Desktop-lightgrey)
![Framework](https://img.shields.io/badge/framework-Tauri%20%7C%20React-cyan)

[**中文说明 (Chinese README)**](README_CN.md)

**Dual N-Back** is a meticulously crafted desktop application designed to systematically enhance core cognitive abilities, including working memory, attention, and fluid intelligence, through the scientifically validated Dual N-Back task. This application combines a modern user interface, highly customizable training parameters, and detailed performance analytics to provide a professional-grade cognitive training experience.

## ✨ Core Features

- **🚀 Scientific Training Method**: Based on the classic Dual N-Back task, a widely researched paradigm proven to effectively improve working memory and fluid intelligence.
- **🎨 Immersive User Experience**: Features a modern, intuitive UI design with smooth animations and audio feedback to create a distraction-free training environment.
- **⚙️ Fine-Grained Parameter Tuning**: Offers highly flexible settings, allowing you to adjust N-Back level, number of trials, stimulus presentation speed, feedback delay, and other core parameters to meet training needs at different stages.
- **📊 Comprehensive Performance Tracking**: Automatically records detailed data for each session, including hit rate, false alarm rate, and d' (a signal detection theory metric), helping you to precisely track your progress.
- **📈 In-Depth Data Insights**: Visualizes your long-term performance data through intuitive charts, clearly displaying trends in your cognitive abilities across different difficulty levels.
- **🌐 Multi-Language Support**: Built-in support for English and Chinese, allowing for seamless language switching.
- **💻 Cross-Platform Compatibility**: Built with the Tauri framework to ensure a native-like, smooth experience on Windows, macOS, and Linux.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI Library**: Recharts (for charts), Lucide React (for icons)
- **Desktop App Framework**: Tauri
- **State Management**: React Context
- **Internationalization**: i18next
- **Data Persistence**: tauri-plugin-store

## 🚀 Quick Start

Follow these steps to set up and run the project in your local environment:

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/aac6fef/dual-n-back.git
    cd dual-n-back
    ```

2.  **Install Dependencies**
    > **Note**: Requires Node.js and Rust development environments.
    ```bash
    npm install
    ```

3.  **Start Development Mode**
    ```bash
    npm run tauri dev
    ```

4.  **Build the Application**
    ```bash
    npm run tauri build
    ```

## 📸 Application Preview

| Game Page | Game in Progress |
| :---: | :---: |
| ![Game Page](screenshot/en/game_page.png) | ![Game Started](screenshot/en/game_started.png) |

| Settings Page | History Page |
| :---: | :---: |
| ![Settings Page](screenshot/en/settings.png) | ![History Hit Rate](screenshot/en/history_hr.png) |

| Trend Analysis | Difficulty Curve |
| :---: | :---: |
| ![False Alarm Trend](screenshot/en/false_alarm_trend.png) | ![Difficulty](screenshot/en/difficulty.png) |

| Detailed History | Event Sequence |
| :---: | :---: |
| ![Detailed History](screenshot/en/history_detail.png) | ![History Event Sequence](screenshot/en/history_detail_event.png) |

## 🤝 Contributing

Contributions of all kinds are welcome! If you have suggestions, find a bug, or want to add a new feature, please feel free to open an [Issue](https://github.com/aac6fef/dual-n-back/issues) or a [Pull Request](https://github.com/aac6fef/dual-n-back/pulls).

## 📄 License

This project is licensed under the [MIT](LICENSE) License.
