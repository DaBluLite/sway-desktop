# GEMINI.md - Sway Desktop Project Context

## Project Overview
**Sway Desktop** is a modern Electron-based radio and music exploration application. It allows users to discover and stream radio stations worldwide using the Radio Browser API and integrates with Subsonic-compatible servers for personal music collections.

### Core Technology Stack
- **Framework**: Electron 39.2 + React 19 (TypeScript 5.9)
- **Audio Backend**: `node-mpv` (Native MPV player running in the Main process)
- **Routing**: TanStack Router 1
- **Styling**: Tailwind CSS 4
- **Build Tool**: Electron Vite 5
- **Package Manager**: `pnpm`
- **Key APIs**: Radio Browser API, Subsonic API

### Architecture
Sway Desktop uses a hybrid architecture where the actual audio processing and recording happen in the **Main Process** for stability and persistence, while the **Renderer Process** handles the UI and state synchronization.

- **Main Process**:
  - `AudioPlayerService`: Manages native MPV playback, retry logic, and state persistence.
  - `RecorderService`: Handles multiple concurrent, silent recording sessions via independent MPV instances.
  - `SubsonicService`: Manages secure credential storage (encrypted) and Subsonic stream generation.
- **Renderer Process**:
  - React application located in `src/renderer/src/app/`.
  - Comprehensive Context Provider tree (`src/renderer/src/app/components/common-provider-wrapper.tsx`) for global state management.
  - `AudioPlayerContext`: Synchronizes with the Main process via IPC to provide a seamless UI experience.
- **Preload/Bridge**:
  - `src/preload/index.ts` exposes safe APIs (`window.api.audioPlayer`, `window.api.recorder`, `window.api.subsonic`) to the renderer.

---

## Building and Running

### Development Commands
- `pnpm install`: Install all project dependencies.
- `pnpm dev`: Start the Vite development server with Hot Module Replacement (HMR).
- `pnpm typecheck`: Run TypeScript compilers for both Node (Main/Preload) and Web (Renderer) processes.
- `pnpm lint`: Run ESLint to check for code quality issues.
- `pnpm format`: Automatically format the codebase using Prettier.

### Build Commands
- `pnpm build`: Perform type checking and build the application for all platforms.
- `pnpm build:win`: Build the Windows installer (`.exe`, `.msi`).
- `pnpm build:mac`: Build the macOS application (`.dmg`, `.zip`).
- `pnpm build:linux`: Build the Linux packages (`.AppImage`, `.deb`, `.snap`).
- `pnpm build:unpack`: Build and unpack the application into a directory for debugging.

---

## Development Conventions

### Process Separation
- **Logic in Main**: Anything requiring file system access, native OS features, or long-running background tasks (like audio playback) should reside in the Main process services.
- **Logic in Renderer**: UI state, routing, and user interaction logic should stay in the Renderer process.
- **IPC Communication**: Use the established patterns in `src/types/` for channel names and command/result interfaces. All IPC calls must be exposed via `src/preload/index.ts`.

### Coding Standards
- **Formatting**: Adhere to the `.prettierrc.yaml` configuration (Single quotes, no semicolons, 100 character line width).
- **TypeScript**: Use strict typing. Avoid `any`. Shared types for IPC should be placed in `src/types/`.
- **Styling**: Use Tailwind CSS 4 utility classes.
- **Components**: Prefer functional components with React Hooks.
- **State Management**: Use React Context for global state. Follow the ordering in `CommonProviderWrapper` when adding new providers.

### Audio & Recording
- **MPV**: The application relies on `node-mpv`. Ensure your local environment has `mpv` installed if running in development mode.
- **Recording Path**: Recorded files are saved to `~/Sway Recordings/` by default.
- **Subsonic Security**: Credentials are double-encrypted using `electron-store`'s native encryption and Electron's `safeStorage` API.

---

## Key Files & Directories
- `src/main/services/`: Core logic for common services that need node access, like Subsonic.
- `src/renderer/src/app/contexts/`: Global state management.
- `src/renderer/src/app/routes/`: Application pages and routing logic.
- `src/types/`: Shared TypeScript interfaces and IPC channel definitions.
- `CLAUDE.md`: Highly detailed architectural guide and technical summary.
