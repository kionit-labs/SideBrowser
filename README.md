# Side Browser

A sleek, edge-snapping side browser panel for Windows. Pin it to the left or right edge of your screen, and it slides in when you hover the edge — just like a drawer.

Built with **Electron**, **React**, **TypeScript**, and **Tailwind CSS**.

## Features

- **Edge Snapping & Auto-Hide** — Docks to the left or right of your screen and slides out of view when you lose focus
- **Tabbed Browsing** — Open multiple sites with a clean icon-based sidebar
- **Built-in Ad Blocker** — Powered by Ghostery's adblocker engine
- **Password Manager** — Import and manage credentials from CSV files
- **Customizable Themes** — Multiple color themes with dark/light/system mode
- **Adjustable Transparency** — Control window opacity for an overlay-style experience
- **Address Bar** — Toggle a top or bottom address bar for quick navigation
- **Device Emulation** — Switch between desktop and mobile user agents per tab
- **Per-Tab Controls** — Mute audio, reload, copy URL, open in default browser
- **Always On Top** — Optionally keep the panel above all other windows
- **System Tray** — Minimize to tray for quick access
- **Keyboard-Friendly** — Drag, resize, and navigate with ease

## Screenshots

<!-- Add screenshots here -->

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)
- Windows 10/11 (primary target; macOS/Linux may work with adjustments)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/SideBrowser.git
cd SideBrowser
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Ad Blocking | @ghostery/adblocker-electron |
| Storage | electron-datastore |
| Focus Control | robotjs |

## Project Structure

```
SideBrowser/
├── electron/           # Main process & preload scripts
│   ├── main.ts         # Electron main process
│   ├── preload.ts      # IPC bridge for renderer
│   └── webview-preload.ts  # Injected into webviews
├── src/                # React frontend
│   ├── App.tsx         # Root layout, sidebar, tabs
│   ├── Browser.tsx     # Webview wrapper component
│   ├── Home.tsx        # Home/new tab page
│   ├── Settings.tsx    # Settings panel
│   ├── contexts/       # React contexts (settings)
│   └── utils/          # Theme utilities
├── public/             # Static assets
├── index.html          # Entry HTML
├── vite.config.ts      # Vite + Electron config
└── package.json
```

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Feel free to open issues and pull requests.

## Acknowledgments

Inspired by [SlideBrowser](https://github.com/nicollite/SlideBrowser).
