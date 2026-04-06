# CLAUDE.md - Sway Desktop Architecture Guide

## Quick Summary

**Sway Desktop** is an Electron-based radio streaming application that allows users to listen to and explore radio stations worldwide. It combines a React frontend with a native audio backend (node-mpv) running in the main process.

- **Type**: Electron Desktop Application
- **Framework**: React 19 + TypeScript
- **Audio Backend**: node-mpv (native MPV player in main process)
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS 4
- **Package Manager**: pnpm
- **Target Platforms**: Windows, macOS, Linux

---

## Architecture Overview

### Process Architecture

```
┌─────────────────────────────────────────────────────┐
│              Main Process (Node.js)                 │
│  ┌───────────────────────────────────────────────┐  │
│  │  AudioPlayerService (node-mpv)                │  │
│  │  - Playback control                           │  │
│  │  - Retry logic with exponential backoff       │  │
│  │  - State persistence (JSON file)              │  │
│  │  - Multi-window state synchronization         │  │
│  │  - Recording functionality                    │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  RecorderService (multi-MPV instances)        │  │
│  │  - Independent recording sessions             │  │
│  │  - Unique recorder IDs for each session       │  │
│  │  - Timed recordings with auto-stop            │  │
│  │  - Silent recording (0 volume)                │  │
│  │  - Multiple concurrent recordings             │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  IPC Handler Registry                         │  │
│  │  - Audio commands (play, pause, stop, etc)    │  │
│  │  - Window controls                            │  │
│  │  - Recording controls                         │  │
│  │  - Recorder service commands                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                     ↕ (IPC Bridge)
┌─────────────────────────────────────────────────────┐
│           Renderer Process (Electron BrowserWindow) │
│  ┌───────────────────────────────────────────────┐  │
│  │  React App (src/renderer/src/app/)            │  │
│  │  ├─ Routes (TanStack Router)                  │  │
│  │  ├─ Components & Pages                        │  │
│  │  └─ Context Providers (Audio, UI State, etc)  │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  AudioPlayerContext                           │  │
│  │  ├─ Syncs state with main process via IPC    │  │
│  │  ├─ Manages HTMLAudioElement (for Web Audio) │  │
│  │  ├─ Controls equalizer (10-band EQ)          │  │
│  │  └─ Renders UI controls                       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Key Features

- **Native Audio Playback**: Uses `node-mpv` (MPV player) in main process for reliable audio
- **Hybrid Architecture**: Actual playback in main process, UI/Web Audio (equalizer) in renderer
- **Multi-Window Support**: Main window + overlay window (Ctrl+Shift+M)
- **Web Audio API**: 10-band equalizer integrated
- **Persistent State**: Audio state saved to disk, restored on app restart
- **Retry Logic**: Exponential backoff when stations fail to play
- **Recording**: Audio recording functionality (uses media APIs)
- **Radio Browser API**: Integration with radioligand-api for station discovery

---

## Project Structure

### Root Level Configuration

```
/
├── package.json                 # Dependencies, scripts
├── pnpm-lock.yaml              # Locked dependency versions
├── tsconfig.json               # TypeScript config reference
├── tsconfig.node.json          # Main/Preload TS config
├── tsconfig.web.json           # Renderer TS config
├── electron.vite.config.ts     # Build configuration
├── electron-builder.yml        # Electron packager config
├── eslint.config.mjs           # Linting rules
├── .prettierrc.yaml            # Code formatting
├── .vscode/                    # VSCode settings & launch config
└── resources/                  # App icon
```

### Source Code Structure

```
src/
├── main/                       # Electron main process
│   ├── index.ts               # Entry point, app initialization, IPC handlers
│   └── services/
│       └── audio-player-service.ts  # Audio playback & state management
│
├── preload/                    # Preload script (context bridge)
│   ├── index.ts               # Exposes API to renderer
│   └── index.d.ts             # Type definitions
│
├── renderer/                   # Web app (Electron renderer process)
│   ├── index.html             # Main window HTML
│   ├── overlay.html           # Overlay window HTML
│   └── src/
│       ├── app/               # Main application
│       │   ├── main.tsx       # React entry point
│       │   ├── env.d.ts       # Module declarations
│       │   ├── assets/        # Static assets
│       │   ├── components/    # React components
│       │   │   ├── audio-player.tsx          # Playback controls UI
│       │   │   ├── media-player-screen.tsx   # Main player screen
│       │   │   ├── navbar.tsx                # Navigation
│       │   │   ├── station-*.tsx             # Station browsing UI
│       │   │   ├── *-modal.tsx               # Modal dialogs
│       │   │   └── ...
│       │   ├── contexts/      # React Context providers (state management)
│       │   │   ├── audio-player-context.tsx     # Audio state sync
│       │   │   ├── alarm-context.tsx
│       │   │   ├── equalizer-context.tsx
│       │   │   ├── playlists-context.tsx
│       │   │   ├── theme-context.tsx
│       │   │   ├── modal-context.tsx
│       │   │   └── ...
│       │   ├── hooks/         # Custom React hooks
│       │   ├── lib/           # Utilities
│       │   │   └── audio-eq.ts         # 10-band equalizer
│       │   ├── routes/        # TanStack Router pages
│       │   │   ├── __root.tsx          # Root layout
│       │   │   ├── index.tsx           # Home page
│       │   │   ├── library/            # Library routes
│       │   │   ├── map/                # Map view
│       │   │   └── settings/           # Settings pages
│       │   ├── types/         # TypeScript interfaces
│       │   └── utils/         # Helper functions
│       └── overlay/           # Second window (overlay)
│           ├── main.tsx       # Overlay entry point
│           └── ...
│
└── types/
    └── audio-player.ts        # Shared type definitions for IPC

build/                          # Electron builder resources
resources/                      # App icon
```

### Key Directory Explanations

#### `src/main/` - Main Process (Node.js + Electron)
- **Single entry point**: `index.ts` - handles app lifecycle, window creation, and IPC
- **AudioPlayerService**: Manages playback using node-mpv
  - State management (what's playing, volume, mute status)
  - Persistent storage (saves state to `~/.config/sway-desktop/audio-player-state.json`)
  - Retry logic with exponential backoff
  - Multi-window coordination
  - Recording interface

#### `src/preload/` - Context Bridge
- Exposes safe APIs to renderer process via Electron's context isolation
- `api.audioPlayer.*` - Audio control methods
- `api.window.*` - Window control methods
- Translates renderer IPC calls to main process handlers

#### `src/renderer/src/app/` - React Application
- **components/**: UI components (buttons, modals, cards, etc.)
- **contexts/**: React Context for state management
  - `AudioPlayerContext`: Main audio state (synced with main process)
  - Others: UI state (modals, theme, playlists, etc.)
- **routes/**: Page components using TanStack Router
- **hooks/**: Custom React hooks for shared logic
- **lib/**: Utility libraries (audio equalizer)
- **assets/**: Static resources (CSS, icons, images)

#### `src/renderer/src/overlay/` - Overlay Window
- Separate React app for the overlay window (Ctrl+Shift+M)
- Shares same context/component infrastructure
- Renders on top of desktop

#### `src/types/audio-player.ts` - Shared Types
Central location for audio-related interfaces used by main process and renderer

---

## Technology Stack

### Core Technologies
- **Electron 39.2** - Desktop application framework
- **Electron Vite 5** - Build tool (Vite + Electron)
- **React 19** - UI framework
- **TypeScript 5.9** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **TanStack Router 1** - Client-side routing

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `node-mpv` | Native audio playback (MPV player wrapper) |
| `radio-browser-api` | Radio station API integration |
| `@electron-toolkit/*` | Electron development utilities |
| `react-castjs` | Chromecast support |
| `@react-google-maps/api` | Google Maps integration |
| `@mdi/react` + `@mdi/js` | Material Design icons |
| `electron-updater` | Auto-update support |

### Dev Dependencies
- ESLint (with TS, React, React Hooks plugins)
- Prettier (code formatting)
- Vite plugins (React, Tailwind, SVG, Router)

---

## Development Workflow

### Installation & Setup
```bash
# Install dependencies
pnpm install

# Type checking
pnpm typecheck         # Check both node and web
pnpm typecheck:node    # Main/preload only
pnpm typecheck:web     # Renderer only
```

### Development
```bash
# Start dev server with hot reload
pnpm dev

# Preview production build locally
pnpm start

# Format code
pnpm format

# Lint (cache enabled)
pnpm lint
```

### Building
```bash
# Build for all platforms (type checks first)
pnpm build

# Platform-specific builds
pnpm build:win       # Windows (.exe, .msi)
pnpm build:mac       # macOS (.dmg, .zip)
pnpm build:linux     # Linux (.AppImage, .deb, .snap)

# Unpack build (for debugging)
pnpm build:unpack
```

### CI/CD
- **Trigger**: Push to `main` with changed `package.json`
- **Action**: `.github/workflows/release.yml`
- **Process**:
  1. Check if version in package.json changed
  2. Build on Linux, Windows, and macOS in parallel
  3. Upload artifacts
  4. Create GitHub release with all builds
- **Requirement**: `PAT_TOKEN` secret configured

---

## IPC Architecture (Main ↔ Renderer Communication)

### Command Pattern (Request-Response)

**Renderer → Main (invoke/handle):**
```typescript
// In preload: api.audioPlayer.playStation(station)
// In main: ipcMain.handle(AudioPlayerChannels.PLAY_STATION, async (_event, station) => {...})
```

**Channels:**
- `audio-player:play-station` - Start playing a station
- `audio-player:pause` - Pause playback
- `audio-player:stop` - Stop playback
- `audio-player:set-volume` - Set volume (0-1)
- `audio-player:toggle-mute` - Toggle mute
- `audio-player:get-state` - Get current state

### Event Pattern (One-Way Notifications)

**Main → Renderer (send/on):**
- `audio-player:state-changed` - State update from main process
- `window-maximize-changed`, `window-minimize-changed`, `window-focus-changed` - Window events

**Renderer → Main (send):**
- `audio-player:renderer-event` - Report UI events (used for feedback)

### State Synchronization Flow
1. Renderer calls `api.audioPlayer.playStation(station)`
2. Main process invokes handler in AudioPlayerService
3. Service updates internal state and MPV player
4. Service broadcasts state change to all registered windows via IPC
5. Renderer receives `state-changed` event and updates React context
6. Components re-render with new state

---

## Audio Implementation Details

### Current Implementation (node-mpv based)

**Location**: `src/main/services/audio-player-service.ts`

**Key Features:**
- Uses `node-mpv` library for native audio playback
- Manages MPV player instance with socket communication
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
- State persistence to JSON file in app data directory
- Multi-window state synchronization
- Error handling and recovery

**How It Works:**
1. Main process initializes node-mpv with audio-only configuration
2. When renderer calls `playStation`, service tells MPV to load URL
3. MPV events (started, paused, stopped) update service state
4. Service broadcasts state via IPC to all windows
5. Renderer context receives updates and re-renders

**Event Listeners in MPV:**
- `started` - Playback began
- `paused` - Playback paused
- `stopped` - Playback stopped
- `error` - Playback failed (triggers retry)

### Web Audio API (Equalizer)

**Location**: `src/renderer/src/app/lib/audio-eq.ts`

**Purpose**: 10-band equalizer
- **Note**: Operates on a dummy HTMLAudioElement (not actually playing)
- May be integrated with recording in the future
- Equalizer context manages UI and frequency adjustments

### State Persistence

**File Location**: `~/.config/sway-desktop/audio-player-state.json` (app data dir)

**Persists:**
```typescript
interface PersistedAudioState {
  currentStation: Station | null
  volume: number
  isMuted: boolean
}
```

**Does NOT persist:**
- `isPlaying` and `isLoading` (intentionally start as false)

**On App Startup:**
1. AudioPlayerService loads persisted state
2. Broadcasts to renderer via IPC
3. Renderer context initializes with persisted values
4. User can resume from where they left off

---

## Recorder Service (Multi-Instance Recording)

**Location**: `src/main/services/recorder-service.ts`

The RecorderService provides independent recording capabilities separate from the main audio player. It spawns separate MPV instances for each recording session, allowing multiple concurrent recordings.

**Key Features:**
- **Multiple Concurrent Recordings**: Each recording uses its own MPV instance
- **Silent Recording**: All recorder instances run at 0 volume (muted)
- **Timed Recordings**: Optional duration parameter for auto-stop
- **Unique Session IDs**: Each recording gets a unique identifier for management
- **Independent State**: Recordings don't interfere with main audio playback

**How It Works:**
1. Renderer calls `api.recorder.startRecording(station, duration?)`
2. Service creates new MPV instance with unique socket path
3. MPV instance loads station URL and starts recording immediately
4. Service assigns unique ID and tracks recording state
5. Optional: Auto-stop after specified duration
6. Renderer can stop individual recordings via ID or stop all recordings

**API Methods (via `window.api.recorder`):**
- `startRecording(station, duration?)` - Start new recording session
- `stopRecording(recorderId)` - Stop specific recording
- `stopAllRecordings()` - Stop all active recordings
- `getActiveRecordings()` - Get list of active recording states
- `getRecording(recorderId)` - Get specific recording state
- `onStateChanged(callback)` - Listen for recording state changes

**Recording State:**
```typescript
interface RecorderState {
  id: string
  station: Station
  state: 'initializing' | 'recording' | 'stopped' | 'error'
  startTime: number
  endTime?: number
  outputPath: string
  duration?: number  // predetermined duration in ms
  elapsed: number    // actual elapsed time in ms
  error?: string
}
```

**Output Files:**
- Saved to `~/Sway Recordings/`
- Format: `{station_name}_{timestamp}_{recorderId}.mp3`
- Example: `groove_salad_2026-04-05T10-30-00-000Z_recorder_1234567890_abc123def.mp3`

---

## Context Providers (State Management)

All contexts are wrapped in `CommonProviderWrapper` (in order):

1. **WindowProvider** - Window state (maximize, minimize, focus)
2. **ThemeProvider** - Light/dark theme
3. **UserLocationProvider** - User's geographic location
4. **VersionProvider** - App version info
5. **EqualizerProvider** - Equalizer state
6. **AudioPlayerProvider** - **Main audio state** (synced with main process)
7. **AlarmProvider** - Alarm/timer functionality
8. **CastContextProvider** - Chromecast support
9. **MediaPlayerScreenProvider** - Media player UI state
10. **SleepTimerProvider** - Sleep timer functionality
11. **RecordingsProvider** - Recording state
12. **PlaylistsProvider** - User playlists
13. **FavouritesProvider** - Favorite stations
14. **HistoryProvider** - Playback history
15. **ModalProvider** - Modal dialog state

**Most Important**: AudioPlayerProvider - syncs with main process via IPC

---

## Key Constraints & Patterns

### Must Stay in Renderer (Web APIs)
- HTMLAudioElement (DOM API)
- AudioContext / Web Audio API
- DOM manipulation
- React rendering

### Should Stay in Renderer (UX)
- Modal dialogs
- Theme switching
- UI state management
- Form interactions

### Main Process Handles (Reliability, Persistence)
- Actual audio playback (node-mpv)
- State persistence
- Error handling & retry logic
- Cross-window state sync
- Recording

### IPC Best Practices Used
- Commands return `AudioPlayerCommandResult` with error info
- Events broadcast to all windows
- Window registration/unregistration for cleanup
- Type-safe channel names (constants in `AudioPlayerChannels`)

---

## Important Files to Know

### Configuration Files
- `package.json` - Scripts, dependencies, build info
- `electron.vite.config.ts` - Build config (paths, plugins)
- `electron-builder.yml` - Packaging for all platforms
- `tsconfig*.json` - TypeScript configurations (3 separate ones)

### Entry Points
- **Main**: `src/main/index.ts`
- **Renderer**: `src/renderer/src/app/main.tsx`
- **Overlay**: `src/renderer/src/overlay/main.tsx`
- **Preload**: `src/preload/index.ts`
- **AudioPlayerService**: `src/main/services/audio-player-service.ts`
- **RecorderService**: `src/main/services/recorder-service.ts`

### Type Definitions
- `src/types/audio-player.ts` - Audio player IPC and state types
- `src/types/recorder.ts` - Recorder service IPC and state types
- `src/preload/index.d.ts` - API types for renderer

### Key Component Files
- `src/renderer/src/app/components/common-provider-wrapper.tsx` - Provider setup
- `src/renderer/src/app/components/audio-player.tsx` - Playback controls UI
- `src/renderer/src/app/components/media-player-screen.tsx` - Main player view
- `src/renderer/src/app/routes/index.tsx` - Home page

---

## Common Development Tasks

### Development Guidelines

**IMPORTANT: Do NOT create unnecessary files**
- **Never create example components** unless explicitly requested by the user for actual use in the app
- **Never create README files, documentation files, or .md files** unless explicitly requested
- **Never create test components or demo components** - the existing codebase is sufficient for understanding
- Focus on implementing actual functionality, not examples or documentation

### Add a New Audio Control Command
1. Add channel name to `AudioPlayerChannels` in `src/types/audio-player.ts`
2. Add method signature to `IAudioPlayerService` interface
3. Implement in `AudioPlayerService` class
4. Add `ipcMain.handle()` in `src/main/index.ts`
5. Add method to preload API in `src/preload/index.ts`
6. Call via `window.api.audioPlayer.newCommand()` in renderer

### Add a New Recorder Service Command
1. Add channel name to `RecorderChannels` in `src/types/recorder.ts`
2. Add method signature to `IRecorderService` interface
3. Implement in `RecorderService` class
4. Add `ipcMain.handle()` in `src/main/index.ts`
5. Add method to preload API in `src/preload/index.ts`
6. Call via `window.api.recorder.newCommand()` in renderer

### Add a New Context Provider
1. Create `src/renderer/src/app/contexts/new-context.tsx`
2. Define context, provider component, hook
3. Add to `CommonProviderWrapper` in correct order
4. Use via `useNewContext()` hook in components

### Handle State from Main Process
1. Listen to `state-changed` IPC event in AudioPlayerContext
2. Update local React state
3. Components re-render automatically

### Debug Audio Issues
1. Check `console.log` output from main process (terminal where app started)
2. Check renderer console in DevTools (F12 in dev mode)
3. Verify state via `api.audioPlayer.getState()` in console
4. Check persisted state file: `~/.config/sway-desktop/audio-player-state.json`
5. Look for MPV errors in main process output

---

## Build & Distribution

### Local Development Build
```bash
pnpm dev
```

### Production Build
```bash
pnpm build
pnpm build:win      # Windows only
pnpm build:mac      # macOS only
pnpm build:linux    # Linux only
```

### Release Process
1. Update version in `package.json`
2. Push to `main` branch
3. GitHub Actions runs automatically:
   - Detects version change
   - Builds on all platforms
   - Creates GitHub release with artifacts
4. Download installers from release page

### Platform Details
- **Windows**: `.exe` (NSIS installer) and `.msi`
- **macOS**: `.dmg` and `.zip` (auto-update requires notarization)
- **Linux**: `.AppImage`, `.deb`, `.snap`, `.tar.gz`

---

## Testing & Linting

### Type Checking
```bash
pnpm typecheck        # Both
pnpm typecheck:node   # Main/preload
pnpm typecheck:web    # Renderer
```

### Linting
```bash
pnpm lint
```

### Code Formatting
```bash
pnpm format
```

**Config Files:**
- `.prettierrc.yaml` - Single quotes, no semicolons, 100 char line width
- `eslint.config.mjs` - React, React Hooks, TypeScript rules

---

## Quick Debugging Checklist

When something doesn't work:

1. **App won't start?**
   - Check: `pnpm install`
   - Check: Node version (use 20+)
   - Delete `node_modules/` and `pnpm-lock.yaml`, reinstall

2. **Audio won't play?**
   - Check main process console for MPV errors
   - Verify radio URL is valid
   - Check volume isn't muted
   - Verify internet connection
   - Try different station

3. **State not syncing?**
   - Check IPC is working: Open DevTools, call `window.api.audioPlayer.getState()`
   - Check renderer is listening: Look for "State changed" logs
   - Verify window is registered with service

4. **Type errors?**
   - Run `pnpm typecheck`
   - Check both `tsconfig.node.json` and `tsconfig.web.json`
   - May need separate type fixes for main and renderer

5. **Build fails?**
   - Run `pnpm build:unpack` for more details
   - Check `out/` directory for artifacts
   - Ensure all dependencies installed with pnpm

---

## Architecture Decision: Why node-mpv?

The app uses node-mpv for audio playback (not HTMLAudioElement) because:

1. **Reliability**: MPV is battle-tested, handles many codec/stream types
2. **No CORS Issues**: Can fetch from any radio URL
3. **Persistence**: State survives across windows/app restarts
4. **Control**: Better error handling, retry logic, statistics
5. **Recording**: Can capture audio at input level
6. **Stability**: Playback state in main process, more resilient

The hybrid approach:
- **Main process**: Actual playback (node-mpv)
- **Renderer**: State sync (IPC), UI (React), Web Audio API (equalizer)

This separation ensures:
- ✅ Responsive UI (not blocked by audio)
- ✅ Persistent state (main process)
- ✅ Cross-window coordination
- ✅ Reliable audio (native library)

---

## Next Steps for New Contributors

1. **Read**: This file (you're doing it!)
2. **Explore**: Run `pnpm dev`, click around the UI
3. **Understand**: Look at `src/main/index.ts` and `src/main/services/audio-player-service.ts`
4. **Study**: Check `src/renderer/src/app/contexts/audio-player-context.tsx` for IPC integration
5. **Code**: Start with small changes to understand the pattern
6. **Reference**: Come back to this file when something doesn't make sense

---

**Last Updated**: April 2026
**Architecture**: Electron + React + node-mpv
**Status**: Production-ready
