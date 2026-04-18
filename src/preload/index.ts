import { ipcRenderer, contextBridge } from 'electron'
import { Station } from 'radio-browser-api'
import { SubsonicCommandResult, SubsonicChannels, SubsonicSong } from '../types/subsonic'
import {
  AudioPlayerCommandResult,
  AudioPlayerState,
  AudioPlayerStateChanged,
  AudioPlayerChannels,
  RendererAudioEvent,
  AudioDevice
} from '../types/audio-player'

// Custom APIs for renderer
const api = {
  window: {
    minimize: () => {
      ipcRenderer.send('win-minimize')
    },
    toggleMaximize: () => {
      ipcRenderer.send('win-toggle-maximize')
    },
    close: () => {
      ipcRenderer.send('win-close')
    },
    hideOverlay: () => {
      ipcRenderer.send('overlay-hide')
    },
    showOverlay: () => {
      ipcRenderer.send('overlay-show')
    },
    onOverlayHiding(callback: () => void): () => void {
      const listener = () => {
        callback()
      }
      ipcRenderer.on('overlay-hiding', listener)

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('overlay-hiding', listener)
      }
    }
  },
  audioPlayer: {
    async playStation(station: Station): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.PLAY_STATION, station)
    },
    async playSong(song: SubsonicSong, streamUrl: string): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.PLAY_SONG, song, streamUrl)
    },
    async playSongs(songs: SubsonicSong[], index: number): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.PLAY_SONGS, songs, index)
    },
    async pause(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.PAUSE)
    },
    async resume(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.RESUME)
    },
    async stop(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.STOP)
    },
    async next(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.NEXT)
    },
    async previous(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.PREVIOUS)
    },
    async addToQueue(
      songs: SubsonicSong[],
      position: 'next' | 'last'
    ): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.ADD_TO_QUEUE, songs, position)
    },
    async setVolume(volume: number): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.SET_VOLUME, volume)
    },
    async toggleMute(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.TOGGLE_MUTE)
    },
    async seek(position: number): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.SEEK, position)
    },
    async updateSettings(settings: Partial<AudioPlayerState>): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.UPDATE_SETTINGS, settings)
    },
    async getAudioDevices(): Promise<AudioDevice[]> {
      return ipcRenderer.invoke(AudioPlayerChannels.GET_DEVICES)
    },
    async refreshDevices(): Promise<void> {
      ipcRenderer.send(AudioPlayerChannels.REFRESH_DEVICES)
    },
    async getState(): Promise<AudioPlayerState> {
      return ipcRenderer.invoke(AudioPlayerChannels.GET_STATE)
    },
    onStateChanged(callback: (event: AudioPlayerStateChanged) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, event: AudioPlayerStateChanged) => {
        callback(event)
      }
      ipcRenderer.on(AudioPlayerChannels.STATE_CHANGED, listener)
      return () => {
        ipcRenderer.removeListener(AudioPlayerChannels.STATE_CHANGED, listener)
      }
    },
    onDevicesChanged(callback: (devices: AudioDevice[]) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, devices: AudioDevice[]) => {
        callback(devices)
      }
      ipcRenderer.on(AudioPlayerChannels.DEVICES_CHANGED, listener)
      return () => {
        ipcRenderer.removeListener(AudioPlayerChannels.DEVICES_CHANGED, listener)
      }
    },
    onRetryPlayback(callback: (station: Station) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, station: Station) => {
        callback(station)
      }
      ipcRenderer.on(AudioPlayerChannels.RETRY_PLAYBACK, listener)
      return () => {
        ipcRenderer.removeListener(AudioPlayerChannels.RETRY_PLAYBACK, listener)
      }
    },
    reportRendererEvent(event: RendererAudioEvent): void {
      ipcRenderer.send(AudioPlayerChannels.RENDERER_EVENT, event)
    },
    async startRecording(station: Station): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke('audio-player:start-recording', station)
    },
    async stopRecording(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke('audio-player:stop-recording')
    }
  },
  subsonic: {
    // Credentials management commands
    async setCredentials(
      username: string,
      password: string,
      serverUrl: string
    ): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.SET_CREDENTIALS, username, password, serverUrl)
    },

    async clearCredentials(): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.CLEAR_CREDENTIALS)
    },

    async getCredentialsStatus(): Promise<{ configured: boolean; username?: string }> {
      return ipcRenderer.invoke(SubsonicChannels.GET_CREDENTIALS_STATUS)
    },

    async ping(): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.PING)
    },

    // Song metadata
    async getSong(songId: string): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_SONG, songId)
    },

    async getAlbum(albumId: string): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_ALBUM, albumId)
    },

    async getArtist(artistId: string): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_ARTIST, artistId)
    },

    async getPlaylists(): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_PLAYLISTS)
    },

    async getPlaylist(playlistId: string): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_PLAYLIST, playlistId)
    },

    async createPlaylist(name: string, songIds: string[]): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.CREATE_PLAYLIST, name, songIds)
    },

    async deletePlaylist(playlistId: string): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.DELETE_PLAYLIST, playlistId)
    },

    async scrobble(songId: string, submission: boolean): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.SCROBBLE, songId, submission)
    },

    async updatePlaylist(
      playlistId: string,
      name?: string,
      comment?: string
    ): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.UPDATE_PLAYLIST, playlistId, name, comment)
    },

    async replacePlaylistSongs(
      playlistId: string,
      songIds: string[]
    ): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.REPLACE_PLAYLIST_SONGS, playlistId, songIds)
    },

    async reportPlayback(
      songId: string,
      position: number,
      state: 'starting' | 'playing' | 'paused' | 'stopped'
    ): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.REPORT_PLAYBACK, songId, position, state)
    },

    async getCoverArtUrl(id: string): Promise<string | null> {
      return ipcRenderer.invoke(SubsonicChannels.GET_COVER_ART_URL, id)
    },

    generateStreamUrl(id: string): Promise<string | null> {
      return ipcRenderer.invoke(SubsonicChannels.GET_STREAM_BASE_URL, id)
    },

    async getMostPlayed(options?: {
      offset: string
      size: string
    }): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_MOST_PLAYED, options)
    },

    async getNewlyAddedAlbums(options: {
      size: string
      offset: string
    }): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_NEWLY_ADDED_ALBUMS, options)
    },

    async getTopSongs(artist: string, count?: string): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_TOP_SONGS, { artist, count })
    },

    async getRandomAlbums(options?: {
      size: string
      offset: string
    }): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_RANDOM_ALBUMS, options)
    },

    async search(options: {
      query: string
      offset?: number
      size?: number
    }): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_SEARCH_RESULTS, options)
    },

    async getStarred(): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.GET_STARRED)
    },

    async star(options: {
      id?: string
      artistId?: string
      albumId?: string
    }): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.STAR, options)
    },

    async unstar(options: {
      id?: string
      artistId?: string
      albumId?: string
    }): Promise<SubsonicCommandResult> {
      return ipcRenderer.invoke(SubsonicChannels.UNSTAR, options)
    },

    // Event listeners
    onCredentialsChanged(
      callback: (status: { configured: boolean; username?: string }) => void
    ): () => void {
      const listener = (
        _event: Electron.IpcRendererEvent,
        status: { configured: boolean; username?: string }
      ) => {
        callback(status)
      }
      ipcRenderer.on(SubsonicChannels.CREDENTIALS_CHANGED, listener)

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(SubsonicChannels.CREDENTIALS_CHANGED, listener)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
