<div align="center">

# 🌐 Side Browser

**A sleek, edge-snapping side browser panel for Windows.**

Pin it to the left or right edge of your screen — it slides in when you hover the edge, just like a drawer.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧲 **Edge Snapping** | Docks to screen edges, auto-hides on blur |
| 🗂️ **Tabbed Browsing** | Multiple sites with icon-based sidebar |
| 🛡️ **Ad Blocker** | Built-in, powered by Ghostery engine |
| 🔐 **Password Manager** | Import & manage credentials via CSV |
| 🎨 **Themes** | Multiple colors + Dark / Light / System |
| 🪟 **Transparency** | Adjustable window opacity |
| 📍 **Address Bar** | Toggleable top or bottom URL bar |
| 📱 **Device Emulation** | Switch desktop ↔ mobile UA per tab |
| 🔇 **Per-Tab Audio** | Mute, reload, copy URL, open externally |
| 📌 **Always On Top** | Optional floating mode |
| 🖥️ **System Tray** | Minimize to tray |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- Windows 10 / 11

### Install & Run

```bash
git clone https://github.com/kionit-labs/SideBrowser.git
cd SideBrowser
npm install
npm run dev
```

### Build

```bash
npm run build
```

---

## 🧱 Tech Stack

<div align="center">

| | Technology | Purpose |
|---|-----------|---------|
| ⚡ | **Electron 41** | Desktop shell |
| ⚛️ | **React 19** | UI framework |
| 🔷 | **TypeScript 5.9** | Type safety |
| 💨 | **Tailwind CSS 4** | Styling |
| 🎞️ | **Framer Motion** | Animations |
| 🎯 | **Lucide React** | Icons |
| 🛡️ | **Ghostery Adblocker** | Ad blocking |
| 💾 | **electron-datastore** | Persistent storage |

</div>

---

## 📁 Project Structure

```
SideBrowser/
├── electron/                # Main process
│   ├── main.ts              # Window, tray, edge-snapping
│   ├── preload.ts           # IPC bridge
│   └── webview-preload.ts   # Webview injection
├── src/                     # React frontend
│   ├── App.tsx              # Layout, sidebar, tabs
│   ├── Browser.tsx          # Webview wrapper
│   ├── Home.tsx             # New tab page
│   ├── Settings.tsx         # Settings panel
│   ├── contexts/            # Settings context
│   └── utils/               # Theme engine
├── public/                  # Static assets
└── package.json
```

---

## 📄 License

[MIT](LICENSE) © 2026 [kionit-labs](https://github.com/kionit-labs)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to open a [pull request](https://github.com/kionit-labs/SideBrowser/pulls) or [issue](https://github.com/kionit-labs/SideBrowser/issues).
