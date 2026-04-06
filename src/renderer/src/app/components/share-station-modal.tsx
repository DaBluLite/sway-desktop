import { useState, useMemo } from 'react'
import { Icon } from '@mdi/react'
import {
  mdiClose,
  mdiShareVariant,
  mdiContentCopy,
  mdiCheck,
  mdiQrcode,
  mdiLink,
  mdiTwitter,
  mdiFacebook,
  mdiWhatsapp,
  mdiEmail
} from '@mdi/js'
import { Station } from 'radio-browser-api'
import { generateStationShareUrl, copyToClipboard, generateQRCodeUrl } from '../utils/data-export'

interface ShareStationModalProps {
  station: Station
  onClose: () => void
}

type ShareTab = 'link' | 'qr' | 'social'

export const ShareStationModal: React.FC<ShareStationModalProps> = ({
  station,
  onClose
}: ShareStationModalProps) => {
  const [activeTab, setActiveTab] = useState<ShareTab>('link')
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => generateStationShareUrl(station), [station])
  const qrCodeUrl = useMemo(() => generateQRCodeUrl(shareUrl, 250), [shareUrl])

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyStationUrl = async () => {
    const success = await copyToClipboard(station.urlResolved || station.url)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareText = `Listen to ${station.name} on Sway Radio!`

  const socialLinks = [
    {
      name: 'Twitter',
      icon: mdiTwitter,
      color: '#1DA1F2',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Facebook',
      icon: mdiFacebook,
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'WhatsApp',
      icon: mdiWhatsapp,
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    },
    {
      name: 'Email',
      icon: mdiEmail,
      color: '#EA4335',
      url: `mailto:?subject=${encodeURIComponent(`Check out ${station.name}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
    }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon path={mdiShareVariant} size={1.2} className="text-white" />
            <h2 className="text-xl font-semibold text-white">Share Station</h2>
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
            {station.favicon && station.favicon.startsWith('https') ? (
              <img
                src={station.favicon}
                alt={station.name}
                className="w-12 h-12 rounded-sm object-contain raised-interface"
              />
            ) : (
              <div className="w-12 h-12 rounded-sm raised-interface flex items-center justify-center">
                <Icon path={mdiShareVariant} size={1} className="text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{station.name}</h3>
              {station.country && (
                <p className="text-zinc-400 text-sm truncate">{station.country}</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('link')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md use-transition ${
                activeTab === 'link'
                  ? 'raised-interface-lg text-white'
                  : 'raised-interface text-zinc-300'
              }`}
            >
              <Icon path={mdiLink} size={0.8} />
              Link
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md use-transition ${
                activeTab === 'qr'
                  ? 'raised-interface-lg text-white'
                  : 'raised-interface text-zinc-300'
              }`}
            >
              <Icon path={mdiQrcode} size={0.8} />
              QR Code
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md use-transition ${
                activeTab === 'social'
                  ? 'raised-interface-lg text-white'
                  : 'raised-interface text-zinc-300'
              }`}
            >
              <Icon path={mdiShareVariant} size={0.8} />
              Social
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'link' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 raised-interface rounded-md text-white text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-md use-transition flex items-center gap-2 btn`}
                  >
                    <Icon path={copied ? mdiCheck : mdiContentCopy} size={0.8} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Direct Stream URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={station.urlResolved || station.url}
                    readOnly
                    className="flex-1 px-3 py-2 raised-interface rounded-md text-white text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCopyStationUrl}
                    className="px-4 py-2 btn text-white rounded-md use-transition flex items-center gap-2"
                  >
                    <Icon path={mdiContentCopy} size={0.8} />
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Use this URL to play in external media players
                </p>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <img src={qrCodeUrl} alt={`QR Code for ${station.name}`} className="w-64 h-64" />
              </div>
              <p className="text-zinc-400 text-sm mt-4 text-center">
                Scan this QR code to open the station
              </p>
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = qrCodeUrl
                  link.download = `${station.name.replace(/[^a-z0-9]/gi, '_')}-qr.png`
                  link.click()
                }}
                className="mt-4 px-4 py-2 btn text-white rounded-md use-transition flex items-center gap-2"
              >
                <Icon path={mdiQrcode} size={0.8} />
                Download QR Code
              </button>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="grid grid-cols-2 gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 btn rounded-md use-transition"
                >
                  <Icon
                    path={social.icon}
                    size={1.2}
                    style={{ backgroundColor: social.color }}
                    className="p-1 rounded-full text-white shadow-glass border border-subtle"
                  />
                  <span className="text-white font-medium">{social.name}</span>
                </a>
              ))}
            </div>
          )}

          {/* Web Share API (if available) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={async () => {
                try {
                  await navigator.share({
                    title: station.name,
                    text: shareText,
                    url: shareUrl
                  })
                } catch (error) {
                  // User cancelled or share failed
                  console.log('Share cancelled or failed:', error)
                }
              }}
              className="w-full mt-4 px-4 py-3 btn text-white rounded-md use-transition flex items-center justify-center gap-2 font-medium"
            >
              <Icon path={mdiShareVariant} size={1} />
              Share via System
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
