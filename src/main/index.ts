import { app, shell, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Station } from 'radio-browser-api'
import icon from '../../resources/icon.png?asset'
import { AudioPlayerService } from './services/audio-player-service'
import { RecorderService } from './services/recorder-service'
import { AudioPlayerChannels } from '../types/audio-player'
import { RecorderChannels } from '../types/recorder'

// Global service instances
let audioPlayerService: AudioPlayerService | null = null
let recorderService: RecorderService | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Register window with services
    if (audioPlayerService) {
      audioPlayerService.registerWindow(mainWindow.id)
    }
    if (recorderService) {
      recorderService.registerWindow(mainWindow.id)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Window state change events
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximize-changed', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximize-changed', false)
  })

  mainWindow.on('minimize', () => {
    mainWindow.webContents.send('window-minimize-changed', true)
  })

  mainWindow.on('restore', () => {
    mainWindow.webContents.send('window-minimize-changed', false)
  })

  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus-changed', true)
  })

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-focus-changed', false)
  })

  // Unregister window on close
  mainWindow.on('closed', () => {
    if (audioPlayerService) {
      audioPlayerService.unregisterWindow(mainWindow.id)
    }
    if (recorderService) {
      recorderService.unregisterWindow(mainWindow.id)
    }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/' })
  }
}

let secondWindow: BrowserWindow | null = null

function createSecondWindow(): void {
  const { workArea } = screen.getPrimaryDisplay()
  secondWindow = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  secondWindow.on('ready-to-show', () => {
    secondWindow?.show()
    // Register second window with services
    if (audioPlayerService && secondWindow) {
      audioPlayerService.registerWindow(secondWindow.id)
    }
    if (recorderService && secondWindow) {
      recorderService.registerWindow(secondWindow.id)
    }
  })

  secondWindow.on('closed', () => {
    if (audioPlayerService && secondWindow) {
      audioPlayerService.unregisterWindow(secondWindow.id)
    }
    if (recorderService && secondWindow) {
      recorderService.unregisterWindow(secondWindow.id)
    }
    secondWindow = null
  })

  // Load the same dev server or a different route
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    secondWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
  } else {
    secondWindow.loadFile(join(__dirname, '../renderer/overlay.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Initialize services
  audioPlayerService = new AudioPlayerService()
  recorderService = new RecorderService()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handler to get current window state
  ipcMain.handle('get-window-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      return {
        isMaximized: win.isMaximized(),
        isMinimized: win.isMinimized(),
        isFocused: win.isFocused()
      }
    }
    return { isMaximized: false, isMinimized: false, isFocused: true }
  })

  // IPC handlers for window controls
  ipcMain.on('win-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.minimize()
    }
  })

  ipcMain.on('win-toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on('win-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.close()
    }
  })

  const hideOverlayWithAnimation = () => {
    if (secondWindow && !secondWindow.isDestroyed()) {
      // Send event to overlay to add hiding class for animation
      secondWindow.webContents.send('overlay-hiding')

      // Close window after animation completes
      setTimeout(() => {
        if (secondWindow && !secondWindow.isDestroyed()) {
          secondWindow.close()
        }
      }, 500)
    }
  }

  ipcMain.on('overlay-hide', () => {
    hideOverlayWithAnimation()
  })

  ipcMain.on('overlay-show', () => {
    if (!secondWindow || secondWindow.isDestroyed()) {
      createSecondWindow()
    } else {
      secondWindow.show()
      secondWindow.focus()
    }
  })

  // Audio Player IPC Handlers
  ipcMain.handle(AudioPlayerChannels.PLAY_STATION, async (_event, station) => {
    return (
      audioPlayerService?.playStation(station) ?? {
        success: false,
        error: 'Service not initialized'
      }
    )
  })

  ipcMain.handle(AudioPlayerChannels.PAUSE, async (_event) => {
    return audioPlayerService?.pause() ?? { success: false, error: 'Service not initialized' }
  })

  ipcMain.handle(AudioPlayerChannels.STOP, async (_event) => {
    return audioPlayerService?.stop() ?? { success: false, error: 'Service not initialized' }
  })

  ipcMain.handle(AudioPlayerChannels.SET_VOLUME, async (_event, volume) => {
    return (
      audioPlayerService?.setVolume(volume) ?? { success: false, error: 'Service not initialized' }
    )
  })

  ipcMain.handle(AudioPlayerChannels.TOGGLE_MUTE, async (_event) => {
    return audioPlayerService?.toggleMute() ?? { success: false, error: 'Service not initialized' }
  })

  ipcMain.handle(AudioPlayerChannels.GET_STATE, async (_event) => {
    return audioPlayerService?.getState() ?? null
  })

  // Renderer event handler (one-way communication)
  ipcMain.on(AudioPlayerChannels.RENDERER_EVENT, (_event, rendererEvent) => {
    audioPlayerService?.handleRendererEvent(rendererEvent)
  })

  // Recording IPC Handlers (old audio player recording - will be deprecated)
  ipcMain.handle('recording-start', async (_event, station: Station) => {
    return (
      audioPlayerService?.startRecording(station) ?? {
        success: false,
        error: 'Service not initialized'
      }
    )
  })

  ipcMain.handle('recording-stop', async (_event) => {
    return (
      audioPlayerService?.stopRecording() ?? { success: false, error: 'Service not initialized' }
    )
  })

  // Recorder Service IPC Handlers
  ipcMain.handle(RecorderChannels.START_RECORDING, async (_event, station, duration) => {
    return (
      recorderService?.startRecording(station, duration) ?? {
        success: false,
        error: 'Recorder service not initialized'
      }
    )
  })

  ipcMain.handle(RecorderChannels.STOP_RECORDING, async (_event, recorderId) => {
    return (
      recorderService?.stopRecording(recorderId) ?? {
        success: false,
        error: 'Recorder service not initialized',
        recorderId
      }
    )
  })

  ipcMain.handle(RecorderChannels.STOP_ALL_RECORDINGS, async (_event) => {
    return (
      recorderService?.stopAllRecordings() ?? [
        {
          success: false,
          error: 'Recorder service not initialized'
        }
      ]
    )
  })

  ipcMain.handle(RecorderChannels.GET_ACTIVE_RECORDINGS, async (_event) => {
    return recorderService?.getActiveRecordings() ?? []
  })

  ipcMain.handle(RecorderChannels.GET_RECORDING, async (_event, recorderId) => {
    return recorderService?.getRecording(recorderId) ?? null
  })

  createWindow()

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (!secondWindow || secondWindow.isDestroyed()) {
      createSecondWindow()
    } else {
      hideOverlayWithAnimation()
    }
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Clean up services
    if (audioPlayerService) {
      audioPlayerService.dispose()
      audioPlayerService = null
    }
    if (recorderService) {
      recorderService.dispose()
      recorderService = null
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  // Clean up services on app quit
  if (audioPlayerService) {
    audioPlayerService.dispose()
    audioPlayerService = null
  }
  if (recorderService) {
    recorderService.dispose()
    recorderService = null
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
