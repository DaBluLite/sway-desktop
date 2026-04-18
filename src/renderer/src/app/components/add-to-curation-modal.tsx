import { Icon } from '@mdi/react'
import { mdiClose, mdiPlaylistPlus, mdiRadio, mdiCheck, mdiPlus } from '@mdi/js'
import { useCurations } from '../contexts/curations-context'
import { AddToCurationModalProps } from '../types/modal'
import { useModal } from '../contexts/modal-context'

export const AddToCurationModal: React.FC<AddToCurationModalProps> = ({
  station,
  onClose
}: AddToCurationModalProps) => {
  const { collections, addStationToCollection, removeStationFromCollection } = useCurations()
  const { openCreateCurationModal } = useModal()

  const handleToggleCuration = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId)
    if (!collection) return

    const isAlreadyIn = collection.stations.some((s) => s.url === station.url)

    if (isAlreadyIn) {
      removeStationFromCollection(collectionId, station.url)
    } else {
      addStationToCollection(collectionId, station)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon path={mdiPlaylistPlus} size={1.2} className="text-white" />
            <h2 className="text-xl font-semibold text-white">Add to Curation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 invis-btn rounded-md transition"
            aria-label="Close"
          >
            <Icon path={mdiClose} size={1} className="text-white" />
          </button>
        </div>

        <div className="p-4">
          {/* Station Preview */}
          <div className="flex items-center gap-3 p-2 raised-interface-lg rounded-md mb-4">
            <div className="w-12 h-12 rounded-sm raised-interface flex items-center justify-center overflow-hidden">
              {station.favicon ? (
                <img src={station.favicon} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icon path={mdiRadio} size={1} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{station.name}</h3>
              <p className="text-zinc-400 text-sm truncate">
                {station.country || station.countryCode || 'Unknown'}
              </p>
            </div>
          </div>

          <button
            onClick={() => openCreateCurationModal()}
            className="w-full mb-4 px-4 py-3 btn text-white rounded-md transition flex items-center justify-center gap-2"
          >
            <Icon path={mdiPlus} size={1} />
            Create New Curation
          </button>

          {/* Existing Curations */}
          {collections.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              <p className="text-sm text-zinc-400 mb-2">Your Curations</p>
              {collections.map((collection) => {
                const isInCuration = collection.stations.some((s) => s.url === station.url)
                return (
                  <button
                    key={collection.id}
                    onClick={() => handleToggleCuration(collection.id)}
                    className={`w-full flex items-center cursor-pointer gap-3 p-2 rounded-md transition ${
                      isInCuration ? 'raised-interface-lg' : 'raised-interface'
                    }`}
                  >
                    <div
                      className={`size-10 flex items-center justify-center rounded-md bg-linear-to-br ${collection.color}`}
                    >
                      <span className="text-xl">{collection.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-white font-medium truncate">{collection.name}</h4>
                      <p className="text-zinc-400 text-sm">{collection.stations.length} stations</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition shadow-glass border ${
                        isInCuration ? 'raised-interface text-white' : 'text-zinc-400 border-faint'
                      }`}
                    >
                      {isInCuration && <Icon path={mdiCheck} size={0.7} />}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-zinc-400">No curations yet</p>
              <p className="text-zinc-500 text-sm">Create your first curation above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
