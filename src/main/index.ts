import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../build/icon.png?asset'
import { SubsonicService } from './services/subsonic-service'
import { AudioPlayerService } from './services/audio-player-service'
import { SubsonicChannels } from '../types/subsonic'
import { AudioPlayerChannels } from '../types/audio-player'

// Global service instances
let subsonicService: SubsonicService | null = null
let audioPlayerService: AudioPlayerService | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    title: 'Sway Music',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (subsonicService) {
      subsonicService.registerWindow(mainWindow.id)
    }
    if (audioPlayerService) {
      audioPlayerService.registerWindow(mainWindow.id)
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
    if (subsonicService) {
      subsonicService.unregisterWindow(mainWindow.id)
    }
    if (audioPlayerService) {
      audioPlayerService.unregisterWindow(mainWindow.id)
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

//let secondWindow: BrowserWindow | null = null

// function createSecondWindow(): void {
//   const { workArea } = screen.getPrimaryDisplay()
//   secondWindow = new BrowserWindow({
//     x: workArea.x,
//     y: workArea.y,
//     width: workArea.width,
//     height: workArea.height,
//     show: false,
//     frame: false,
//     transparent: true,
//     alwaysOnTop: true,
//     skipTaskbar: true,
//     resizable: false,
//     movable: false,
//     webPreferences: {
//       preload: join(__dirname, '../preload/index.js'),
//       sandbox: false
//     }
//   })

//   secondWindow.on('ready-to-show', () => {
//     secondWindow?.show()
//     if (subsonicService && secondWindow) {
//       subsonicService.registerWindow(secondWindow.id)
//     }
//     if (audioPlayerService && secondWindow) {
//       audioPlayerService.registerWindow(secondWindow.id)
//     }
//   })

//   secondWindow.on('closed', () => {
//     if (subsonicService && secondWindow) {
//       subsonicService.unregisterWindow(secondWindow.id)
//     }
//     if (audioPlayerService && secondWindow) {
//       audioPlayerService.unregisterWindow(secondWindow.id)
//     }
//     secondWindow = null
//   })

//   // Load the same dev server or a different route
//   if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
//     secondWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`)
//   } else {
//     secondWindow.loadFile(join(__dirname, '../renderer/overlay.html'))
//   }
// }

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  subsonicService = new SubsonicService()
  audioPlayerService = new AudioPlayerService(subsonicService)

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

  // const hideOverlayWithAnimation = () => {
  //   if (secondWindow && !secondWindow.isDestroyed()) {
  //     // Send event to overlay to add hiding class for animation
  //     secondWindow.webContents.send('overlay-hiding')

  //     // Close window after animation completes
  //     setTimeout(() => {
  //       if (secondWindow && !secondWindow.isDestroyed()) {
  //         secondWindow.close()
  //       }
  //     }, 500)
  //   }
  // }

  // Audio Player Service IPC Handlers
  ipcMain.handle(AudioPlayerChannels.PLAY_STATION, async (_event, station) => {
    return await audioPlayerService?.playStation(station)
  })

  ipcMain.handle(AudioPlayerChannels.PLAY_SONG, async (_event, song, streamUrl) => {
    return await audioPlayerService?.playSong(song, streamUrl)
  })

  ipcMain.handle(AudioPlayerChannels.PLAY_SONGS, async (_event, songs, index) => {
    return await audioPlayerService?.playSongs(songs, index)
  })

  ipcMain.handle(AudioPlayerChannels.PAUSE, async () => {
    return await audioPlayerService?.pause()
  })

  ipcMain.handle(AudioPlayerChannels.RESUME, async () => {
    return await audioPlayerService?.resume()
  })

  ipcMain.handle(AudioPlayerChannels.STOP, async () => {
    return await audioPlayerService?.stop()
  })

  ipcMain.handle(AudioPlayerChannels.NEXT, async () => {
    return await audioPlayerService?.next()
  })

  ipcMain.handle(AudioPlayerChannels.PREVIOUS, async () => {
    return await audioPlayerService?.previous()
  })

  ipcMain.handle(AudioPlayerChannels.ADD_TO_QUEUE, async (_event, songs, position) => {
    return await audioPlayerService?.addToQueue(songs, position)
  })

  ipcMain.handle(AudioPlayerChannels.SET_VOLUME, async (_event, volume) => {
    return await audioPlayerService?.setVolume(volume)
  })

  ipcMain.handle(AudioPlayerChannels.TOGGLE_MUTE, async () => {
    return await audioPlayerService?.toggleMute()
  })

  ipcMain.handle(AudioPlayerChannels.SEEK, async (_event, position) => {
    return await audioPlayerService?.seek(position)
  })

  ipcMain.handle(AudioPlayerChannels.UPDATE_SETTINGS, async (_event, settings) => {
    return await audioPlayerService?.updateSettings(settings)
  })

  ipcMain.handle(AudioPlayerChannels.GET_DEVICES, async () => {
    return (await audioPlayerService?.getAudioDevices()) || []
  })

  ipcMain.on(AudioPlayerChannels.REFRESH_DEVICES, async () => {
    await audioPlayerService?.broadcastDeviceList()
  })

  ipcMain.handle(AudioPlayerChannels.GET_STATE, async () => {
    return audioPlayerService?.getState()
  })

  ipcMain.on(AudioPlayerChannels.RENDERER_EVENT, (_event, event) => {
    audioPlayerService?.handleRendererEvent(event)
  })

  // Subsonic Service IPC Handlers
  ipcMain.handle(
    SubsonicChannels.SET_CREDENTIALS,
    async (_event, username, password, serverUrl) => {
      try {
        await subsonicService?.setCredentials(username, password, serverUrl)
        return {
          success: true,
          data: await subsonicService?.getCredentialsStatus()
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set credentials'
        }
      }
    }
  )

  ipcMain.handle(SubsonicChannels.CLEAR_CREDENTIALS, async () => {
    try {
      await subsonicService?.clearCredentials()
      return {
        success: true,
        data: { configured: false }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear credentials'
      }
    }
  })

  ipcMain.handle(SubsonicChannels.GET_CREDENTIALS_STATUS, async () => {
    return await subsonicService?.getCredentialsStatus()
  })

  ipcMain.handle(SubsonicChannels.PING, async () => {
    return (
      subsonicService?.ping() ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_SONG, async (_event, songId) => {
    return (
      subsonicService?.getSong(songId) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.SCROBBLE, async (_event, songId, submission) => {
    return (
      subsonicService?.scrobble(songId, submission) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_ALBUM, async (_event, albumId) => {
    return (
      subsonicService?.getAlbum(albumId) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_ARTIST, async (_event, artistId) => {
    return (
      subsonicService?.getArtist(artistId) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_PLAYLISTS, async () => {
    return (
      subsonicService?.getPlaylists() ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_PLAYLIST, async (_event, playlistId) => {
    return (
      subsonicService?.getPlaylist(playlistId) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.CREATE_PLAYLIST, async (_event, name, songIds) => {
    return (
      subsonicService?.createPlaylist(name, songIds) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.DELETE_PLAYLIST, async (_event, playlistId) => {
    return (
      subsonicService?.deletePlaylist(playlistId) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.REPORT_PLAYBACK, async (_event, songId, position, state) => {
    return (
      subsonicService?.reportPlayback(songId, position, state) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.UPDATE_PLAYLIST, async (_event, playlistId, name, comment) => {
    return (
      subsonicService?.updatePlaylist(playlistId, name, comment) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.REPLACE_PLAYLIST_SONGS, async (_event, playlistId, songIds) => {
    return (
      subsonicService?.replacePlaylistSongs(playlistId, songIds) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_COVER_ART_URL, async (_event, id) => {
    return subsonicService?.getCoverArtUrl(id) ?? null
  })

  ipcMain.handle(SubsonicChannels.GET_MOST_PLAYED, async (_event, options) => {
    return (
      subsonicService?.getMostPlayed(options) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_RANDOM_ALBUMS, async (_event, options) => {
    return (
      subsonicService?.getRandomAlbums(options) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_NEWLY_ADDED_ALBUMS, async (_event, options) => {
    return (
      subsonicService?.getNewlyAddedAlbums(options) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_TOP_SONGS, async (_event, { artist, count }) => {
    return (
      subsonicService?.getTopSongs(artist, count) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_SEARCH_RESULTS, async (_event, options) => {
    return (
      subsonicService?.search(options) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_STARRED, async () => {
    return (
      subsonicService?.getStarred() ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.STAR, async (_event, options) => {
    return (
      subsonicService?.star(options) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.UNSTAR, async (_event, options) => {
    return (
      subsonicService?.unstar(options) ?? {
        success: false,
        error: 'Subsonic service not initialized'
      }
    )
  })

  ipcMain.handle(SubsonicChannels.GET_STREAM_BASE_URL, async (_event, songId) => {
    return subsonicService?.generateStreamUrl(songId) ?? null
  })

  createWindow()

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
    if (subsonicService) {
      subsonicService.dispose()
      subsonicService = null
    }
    if (audioPlayerService) {
      audioPlayerService.dispose()
      audioPlayerService = null
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (subsonicService) {
    subsonicService.dispose()
    subsonicService = null
  }
  if (audioPlayerService) {
    audioPlayerService.dispose()
    audioPlayerService = null
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
