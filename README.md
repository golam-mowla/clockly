# Wallpaper Clock ⏱

> A fast, lightweight Windows desktop clock embedded seamlessly into your desktop wallpaper. Built with **Tauri v2** + **Rust** backend and vanilla HTML5 / CSS3 / JavaScript frontend.

![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?logo=windows)
![Rust](https://img.shields.io/badge/Backend-Rust%20%28Tauri%20v2%29-orange?logo=rust)
![RAM](https://img.shields.io/badge/Memory-%3C%2050%20MB%20idle-brightgreen)
![CPU](https://img.shields.io/badge/CPU-~0.0%25-brightgreen)
![Framework](https://img.shields.io/badge/Framework-Zero%20%28No%20Electron%2C%20No%20Python%29-purple)

---

## 🌟 Overview

**Wallpaper Clock** looks and feels like it's painted directly onto your desktop wallpaper. It sits **ABOVE** the wallpaper image but **BELOW** desktop icons and normal application windows, using the Windows **WorkerW** desktop layering technique.

It is 100% click-through by default so desktop icons, folders, and right-click menus function completely normally. Whenever you want to customize settings or rearrange widgets, press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>C</kbd> or open the tray icon.

---

## ✨ Features

### 🕒 Main Clock
- **Digital & Analog Styles**: Switch between crisp digital numbers and a smooth analog clock with hour, minute, and second hands.
- **12-Hour & 24-Hour Modes**: With optional AM/PM indicator tag.
- **Seconds & Date Controls**: Independently toggle ticking seconds, date string, and weekday name (e.g. `SATURDAY, 14 NOVEMBER 2026`).
- **Date Format Options**: `DD MMMM YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`, and `DD/MM/YYYY`.

### 🌍 Dual Clock (Secondary Timezone)
- Searchable world timezones (`London`, `Tokyo`, `Dhaka`, `New York`, `Los Angeles`, `Sydney`, `Dubai`, etc.).
- Custom city/time label (e.g. `LONDON`, `DHAKA`, `HEADQUARTERS`).
- Separate 12h/24h toggle.

### ⏱ Precision Stopwatch
- Millisecond precision (`MM:SS.ms`).
- Controls: **Start**, **Pause**, **Lap**, and **Reset**.
- Scrollable lap times record list.
- Translucent frosted glass card background.

### 🍅 Pomodoro Focus Timer
- Modes: **Focus** (default: 25 min), **Short Break** (5 min), and **Long Break** (15 min).
- Visual progress bar and session counter (`Session #1 of 4`).
- **Auto-Cycle**: Seamlessly transitions between focus and break intervals.
- **Audio Chimes**: Gentle harmonic bell sound synthesized on-the-fly using the Web Audio API.
- **Windows Native Notifications**: Integrated into Windows Action Center.

### ⏳ Countdown Timer & Simple Alarm
- Countdown with custom durations.
- Daily alarm with custom label and audio alert.

### 🎨 Customization & Appearance
- **Bundled Offline Fonts**: Includes `Inter`, `JetBrains Mono`, `Poppins`, `Orbitron`, `Playfair Display` (serif), and `Raleway` (thin/light).
- **Custom System Font Support**: Type the name of any font installed on your Windows system (`Segoe UI`, `Consolas`, `Georgia`, etc.).
- **Theme Presets**:
  - `Minimal White`: Crisp modern white with soft wallpaper contrast shadow
  - `Cyberpunk Neon`: Electric cyan & magenta glow with Orbitron
  - `Warm Sunset`: Amber terracotta tones
  - `Dark Glass`: Sleek slate frosted glass
  - `Emerald Matrix`: Terminal neon emerald green
  - `Nordic Ice`: Glacial serene blue
  - `Golden Luxury`: Warm champagne and subtle shimmer
- **Typography Controls**: Font weight (200-900), letter spacing, text color picker, opacity, and text shadow toggle.
- **Glassmorphism Settings**: Adjustable blur radius (`backdrop-filter: blur(...)`), border radius, and translucent card opacity.

### 📐 Positioning & Layout
- **Layout Presets**: `Center`, `Top-Left`, `Top-Right`, `Bottom-Left`, `Bottom-Right`, or `Custom`.
- **Drag & Reposition Mode**: Press <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>C</kbd> or click "Drag & Reposition" to freely move widgets across monitors with your mouse. Coordinates are saved in percentage coordinates for responsive multi-resolution support.
- **Global & Clock Scaling**: Smooth sliders from compact to extra large.

### 🚀 System & Performance
- **Run at Windows Startup**: Auto-launches silently to the system tray (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).
- **Single Instance**: Protected via Win32 named mutex (`CreateMutexW`).
- **Fullscreen App Detection**: Automatically detects when a fullscreen game or video player is active and throttles rendering to save maximum CPU and battery.
- **Local AppData Persistence**: Saves settings as clean JSON in `%APPDATA%\WallpaperClock\settings.json`.
- **Export & Import JSON**: Easily backup or share configurations.

---

## 🛠 Tech Stack

| Component | Technology | Why |
|---|---|---|
| **Backend** | Rust + Tauri v2 | Native performance, tiny binary footprint, zero Python/Electron bloat |
| **Window Layering** | Win32 API (`windows-sys`) | Progman `0x052C` WorkerW reparenting + HWND_BOTTOM fallback |
| **Frontend** | Vanilla HTML5 / CSS3 / JS | No heavy frameworks (React/Vue/Angular), near-zero CPU and DOM updates |
| **Sound** | Web Audio API | Zero external audio files; synthesized harmonic chords |
| **Fonts** | Bundled WOFF2 (180 KB) | 100% offline, zero network telemetry |

---

## 📦 Prerequisites to Build from Source

To compile Wallpaper Clock yourself on Windows:

1. **Rust**:
   Install via [rustup.rs](https://rustup.rs/):
   ```bash
   rustup default stable-x86_64-pc-windows-gnu
   # or stable-x86_64-pc-windows-msvc
   ```
2. **Node.js & npm**:
   Node.js v18+ (tested on Node v26).
3. **Microsoft Edge WebView2**:
   Pre-installed on Windows 10 (version 1809+) and Windows 11.
4. **C++ Compiler**:
   Either Visual Studio Build Tools (C++ x64) OR MinGW-w64 / LLVM-MinGW (GCC/Clang).

---

## 🔨 Build Instructions

Clone the repository:
```bash
git clone https://github.com/golam-mowla/wallpaper-clock.git
cd wallpaper-clock
```

Install frontend CLI tooling:
```bash
npm install
```

### Build Portable Executable
```bash
npm run build:portable
# or
cd src-tauri
cargo build --release
```
The standalone binary will be generated at:
`src-tauri/target/release/wallpaper-clock.exe`

### Build Complete Installer
```bash
npm run build
```
The installer will be generated in `src-tauri/target/release/bundle/`.

---

## ⌨ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>C</kbd> | Toggle Interactive / Edit Mode (Reposition widgets) |
| <kbd>Esc</kbd> | Exit Edit Mode and return to click-through wallpaper |

---

## 📄 License

MIT License. Free to use, modify, and distribute.
