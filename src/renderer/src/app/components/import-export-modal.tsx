import { useState, useRef } from 'react'
import { Icon } from '@mdi/react'
import {
  mdiClose,
  mdiDatabaseExport,
  mdiDatabaseImport,
  mdiDownload,
  mdiUpload,
  mdiCheck,
  mdiAlertCircle,
  mdiCheckboxMarkedOutline,
  mdiCheckboxBlankOutline,
  mdiInformation
} from '@mdi/js'
import { useFavourites } from '../contexts/favourites-context'
import { usePlaylists } from '../contexts/playlists-context'
import { useHistory } from '../contexts/history-context'
import { useTheme } from '../contexts/theme-context'
import {
  createExportData,
  downloadExport,
  readFileAsText,
  parseImportData,
  validateImportData,
  type ExportData
} from '../utils/data-export'

interface ImportExportModalProps {
  onClose: () => void
}

type Tab = 'export' | 'import'

interface ExportOptions {
  favourites: boolean
  playlists: boolean
  savedStations: boolean
  history: boolean
  settings: boolean
}

interface ImportOptions {
  favourites: boolean
  playlists: boolean
  savedStations: boolean
  history: boolean
  settings: boolean
  merge: boolean // Whether to merge with existing data or replace
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  onClose
}: ImportExportModalProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('export')
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    favourites: true,
    playlists: true,
    savedStations: true,
    history: true,
    settings: true
  })
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    favourites: true,
    playlists: true,
    savedStations: true,
    history: true,
    settings: true,
    merge: true
  })
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    details?: string[]
  } | null>(null)
  const [importPreview, setImportPreview] = useState<ExportData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get all context data and methods
  const { favourites, importFavourites } = useFavourites()
  const { playlists, importPlaylists } = usePlaylists()
  const { history, importHistory } = useHistory()
  const { theme, setTheme } = useTheme()

  const handleExport = () => {
    setIsProcessing(true)

    try {
      const exportData = createExportData({
        ...(exportOptions.favourites && { favourites }),
        ...(exportOptions.playlists && { playlists }),
        ...(exportOptions.history && { history }),
        ...(exportOptions.settings && { settings: { theme } })
      })

      downloadExport(exportData)

      setImportResult({
        success: true,
        message: 'Data exported successfully!'
      })
    } catch (error) {
      setImportResult({
        success: false,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setImportResult(null)

    try {
      const content = await readFileAsText(file)
      const data = parseImportData(content)

      if (!data) {
        throw new Error('Invalid file format. Please select a valid Sway Radio backup file.')
      }

      setImportPreview(data)
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read file'
      })
    } finally {
      setIsProcessing(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImport = async () => {
    if (!importPreview) return

    setIsProcessing(true)

    try {
      const { errors, sanitized } = validateImportData(importPreview)
      const importDetails: string[] = []
      let totalImported = 0

      if (errors.length > 0) {
        console.warn('Import validation warnings:', errors)
      }

      // Import favourites
      if (importOptions.favourites && sanitized.favourites) {
        const count = sanitized.favourites.length
        importFavourites(sanitized.favourites, importOptions.merge)
        importDetails.push(`${count} favourite${count !== 1 ? 's' : ''}`)
        totalImported += count
      }

      // Import playlists
      if (importOptions.playlists && sanitized.playlists) {
        const count = sanitized.playlists.length
        importPlaylists(sanitized.playlists)
        importDetails.push(`${count} playlist${count !== 1 ? 's' : ''}`)
        totalImported += count
      }

      // Import history
      if (importOptions.history && sanitized.history) {
        const count = sanitized.history.length
        importHistory(sanitized.history, importOptions.merge)
        importDetails.push(`${count} history entr${count !== 1 ? 'ies' : 'y'}`)
        totalImported += count
      }

      // Import settings
      if (importOptions.settings && sanitized.settings) {
        if (sanitized.settings.theme) {
          setTheme(sanitized.settings.theme)
          importDetails.push('theme settings')
        }
      }

      // Build result message
      let message: string
      if (totalImported > 0 || importDetails.length > 0) {
        message = `Import completed! Imported: ${importDetails.join(', ')}.`
        if (errors.length > 0) {
          message += ` (${errors.length} warning${errors.length !== 1 ? 's' : ''})`
        }
      } else {
        message = 'No data was imported. The backup file may be empty or all items already exist.'
      }

      setImportResult({
        success: totalImported > 0 || importDetails.length > 0,
        message,
        details: errors.length > 0 ? errors.slice(0, 5) : undefined
      })
      setImportPreview(null)
    } catch (error) {
      setImportResult({
        success: false,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleExportOption = (key: keyof ExportOptions) => {
    setExportOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleImportOption = (key: keyof ImportOptions) => {
    setImportOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const getDataCounts = () => {
    return {
      favourites: favourites.length,
      playlists: playlists.length,
      history: history.length
    }
  }

  const getPreviewCounts = () => {
    if (!importPreview?.data) return null

    const data = importPreview.data

    return {
      favourites: data.favourites?.length || 0,
      playlists: data.playlists?.length || 0,
      history: data.history?.length || 0,
      hasSettings: !!data.settings?.theme
    }
  }

  const counts = getDataCounts()
  const previewCounts = getPreviewCounts()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-lg!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon
              path={activeTab === 'export' ? mdiDatabaseExport : mdiDatabaseImport}
              size={1.2}
              className="text-white"
            />
            <h2 className="text-xl font-semibold text-white">
              {activeTab === 'export' ? 'Export Data' : 'Import Data'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 invis-btn rounded-full use-transition"
            aria-label="Close"
          >
            <Icon path={mdiClose} size={1} className="text-white" />
          </button>
        </div>

        <div className="p-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setActiveTab('export')
                setImportResult(null)
                setImportPreview(null)
              }}
              className={`flex items-center gap-2 px-4 py-1 rounded-full use-transition btn border border-subtle text-black dark:text-white ${
                activeTab === 'export' ? 'bg-green-600/40!' : ''
              }`}
            >
              <Icon path={mdiDownload} size={0.9} />
              Export
            </button>
            <button
              onClick={() => {
                setActiveTab('import')
                setImportResult(null)
              }}
              className={`flex items-center gap-2 px-4 py-1 rounded-full use-transition btn border border-subtle text-black dark:text-white ${
                activeTab === 'import' ? 'bg-green-600/40!' : ''
              }`}
            >
              <Icon path={mdiUpload} size={0.9} />
              Import
            </button>
          </div>

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="flex flex-col gap-4">
              <p className="text-zinc-300 text-sm">
                Select the data you want to export. The backup file can be used to restore your data
                on another device or after reinstalling.
              </p>

              <div className="flex flex-col gap-2">
                {[
                  {
                    key: 'favourites' as const,
                    label: 'Favourites',
                    count: counts.favourites
                  },
                  {
                    key: 'playlists' as const,
                    label: 'Playlists',
                    count: counts.playlists
                  },
                  {
                    key: 'history' as const,
                    label: 'Listening History',
                    count: counts.history
                  },
                  { key: 'settings' as const, label: 'Settings', count: null }
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => toggleExportOption(key)}
                    className="w-full flex items-center gap-3 p-3 btn rounded-md transition"
                  >
                    <div
                      className={
                        'flex w-6 h-6 rounded-full items-center justify-center border border-transparent use-transition' +
                        (exportOptions[key]
                          ? ' bg-second-layer-thin-active dark:bg-second-layer-thin-active-dark border-faint shadow-glass'
                          : '')
                      }
                    >
                      {exportOptions[key] && (
                        <Icon path={mdiCheck} size={1} className="text-white" />
                      )}
                    </div>
                    <span className="text-white flex-1 text-left">{label}</span>
                    {count !== null && (
                      <span className="text-zinc-400 text-sm">
                        {count} item{count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExport}
                disabled={isProcessing || !Object.values(exportOptions).some(Boolean)}
                className="w-full px-4 py-3 btn-accent disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
              >
                <Icon path={mdiDownload} size={1} />
                {isProcessing ? 'Exporting...' : 'Download Backup'}
              </button>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="flex flex-col gap-4">
              {!importPreview ? (
                <>
                  <p className="text-zinc-300 text-sm">
                    Select a Sway Radio backup file to restore your data. You can choose to merge
                    with existing data or replace it.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full p-8 border-2 border-dashed border-zinc-600/50 hover:border-zinc-500 rounded-md transition flex flex-col items-center gap-3 text-zinc-300 hover:text-white"
                  >
                    <Icon path={mdiUpload} size={2} className="text-white" />
                    <span className="font-medium">
                      {isProcessing ? 'Reading file...' : 'Click to select backup file'}
                    </span>
                    <span className="text-sm text-zinc-400">Supports .json files</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Backup Preview */}
                  <div className="p-4 bg-green-900/30 rounded-lg border border-green-700/30">
                    <h3 className="text-white font-medium mb-3">Backup Preview</h3>
                    <div className="flex flex-col gap-2 text-sm">
                      {previewCounts?.favourites !== undefined && previewCounts.favourites > 0 && (
                        <div className="flex justify-between text-zinc-300">
                          <span>Favourites</span>
                          <span>{previewCounts.favourites} stations</span>
                        </div>
                      )}
                      {previewCounts?.playlists !== undefined && previewCounts.playlists > 0 && (
                        <div className="flex justify-between text-zinc-300">
                          <span>Playlists</span>
                          <span>{previewCounts.playlists} playlists</span>
                        </div>
                      )}
                      {previewCounts?.history !== undefined && previewCounts.history > 0 && (
                        <div className="flex justify-between text-zinc-300">
                          <span>History</span>
                          <span>{previewCounts.history} entries</span>
                        </div>
                      )}
                      {previewCounts?.hasSettings && (
                        <div className="flex justify-between text-zinc-300">
                          <span>Settings</span>
                          <span>Included</span>
                        </div>
                      )}
                      <div className="pt-2 mt-2 border-t border-green-700/30 text-zinc-400">
                        Exported on: {new Date(importPreview.exportedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Import Options */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-white font-medium text-sm">Select what to import:</h4>
                    {[
                      {
                        key: 'favourites' as const,
                        label: 'Favourites',
                        available: (previewCounts?.favourites || 0) > 0
                      },
                      {
                        key: 'playlists' as const,
                        label: 'Playlists',
                        available: (previewCounts?.playlists || 0) > 0
                      },
                      {
                        key: 'history' as const,
                        label: 'History',
                        available: (previewCounts?.history || 0) > 0
                      },
                      {
                        key: 'settings' as const,
                        label: 'Settings',
                        available: previewCounts?.hasSettings || false
                      }
                    ]
                      .filter((item) => item.available)
                      .map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => toggleImportOption(key)}
                          className="w-full flex items-center gap-3 p-2 bg-green-800/20 hover:bg-green-800/40 rounded-lg transition"
                        >
                          <Icon
                            path={
                              importOptions[key]
                                ? mdiCheckboxMarkedOutline
                                : mdiCheckboxBlankOutline
                            }
                            size={0.9}
                            className={importOptions[key] ? 'text-green-400' : 'text-zinc-400'}
                          />
                          <span className="text-white text-sm">{label}</span>
                        </button>
                      ))}
                  </div>

                  {/* Merge Option */}
                  <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                    <button
                      onClick={() => toggleImportOption('merge')}
                      className="w-full flex items-center gap-3"
                    >
                      <Icon
                        path={
                          importOptions.merge ? mdiCheckboxMarkedOutline : mdiCheckboxBlankOutline
                        }
                        size={1}
                        className={importOptions.merge ? 'text-blue-400' : 'text-zinc-400'}
                      />
                      <div className="flex-1 text-left">
                        <span className="text-white text-sm font-medium">
                          Merge with existing data
                        </span>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          {importOptions.merge
                            ? 'New items will be added to your existing data'
                            : 'Existing data will be replaced with imported data'}
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setImportPreview(null)}
                      className="flex-1 px-4 py-3 bg-green-800/40 hover:bg-green-800/60 text-white rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-zinc-600 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
                    >
                      <Icon path={mdiUpload} size={0.9} />
                      {isProcessing ? 'Importing...' : 'Import Data'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Result Message */}
          {importResult && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                importResult.success
                  ? 'bg-green-600/20 border border-green-500/30'
                  : 'bg-red-600/20 border border-red-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  path={importResult.success ? mdiCheck : mdiAlertCircle}
                  size={1}
                  className={importResult.success ? 'text-green-400' : 'text-red-400'}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      importResult.success ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {importResult.message}
                  </p>
                  {importResult.details && importResult.details.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {importResult.details.map((detail, index) => (
                        <p key={index} className="text-xs text-yellow-400 flex items-start gap-1">
                          <Icon path={mdiInformation} size={0.5} className="mt-0.5 shrink-0" />
                          {detail}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
