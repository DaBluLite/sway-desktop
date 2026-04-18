import { Radio } from 'lucide-react'
import { MouseEventHandler, useState } from 'react'

const Pin = ({
  color = '#ef4444',
  size = 40,
  children,
  className = '',
  title = '',
  onClick
}: {
  color?: string
  size?: number
  children?: React.ReactNode
  className?: string
  title?: string
  onClick?: MouseEventHandler<HTMLDivElement>
}) => {
  return (
    <div
      className={`inline-flex flex-col items-center cursor-pointer ${className}`}
      title={title}
      onClick={onClick}
    >
      <div
        className="rounded-full flex items-center justify-center shadow-lg relative"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color
        }}
      >
        {children}
      </div>
      <div
        className="relative"
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size * 0.25}px solid transparent`,
          borderRight: `${size * 0.25}px solid transparent`,
          borderTop: `${size * 0.3}px solid ${color}`,
          marginTop: '-2px'
        }}
      />
    </div>
  )
}

const IconPin = ({
  icon,
  color = '#ef4444',
  size = 40,
  iconColor = 'white',
  title,
  onClick
}: {
  icon: React.ReactNode
  color?: string
  size?: number
  iconColor?: string
  title?: string
  onClick?: MouseEventHandler<HTMLDivElement>
}) => {
  return (
    <Pin color={color} size={size} title={title} onClick={onClick}>
      <span style={{ color: iconColor, fontSize: `${size * 0.5}px` }}>{icon}</span>
    </Pin>
  )
}

const TextPin = ({
  text,
  color = '#ef4444',
  size = 40,
  textColor = 'white',
  onClick
}: {
  text: string
  color?: string
  size?: number
  textColor?: string
  title?: string
  onClick?: MouseEventHandler<HTMLDivElement>
}) => {
  return (
    <Pin color={color} size={size} title={text} onClick={onClick}>
      <span
        className="font-bold"
        style={{
          color: textColor,
          fontSize: `${size * 0.35}px`
        }}
      >
        {text}
      </span>
    </Pin>
  )
}

const ImagePin = ({
  imageUrl,
  size = 40,
  borderColor = 'white',
  title = '',
  onClick
}: {
  imageUrl: string
  size?: number
  borderColor?: string
  title?: string
  onClick?: MouseEventHandler<HTMLDivElement>
}) => {
  const [error, setError] = useState(false)
  return (
    <div className="inline-flex flex-col items-center" title={title} onClick={onClick}>
      <div
        className="rounded-full overflow-hidden shadow-lg border-4 bg-white"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderColor: borderColor
        }}
      >
        {!error ? (
          <img
            src={imageUrl}
            alt="Pin"
            className="w-full h-full object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Radio className="text-black" />
          </div>
        )}
      </div>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size * 0.25}px solid transparent`,
          borderRight: `${size * 0.25}px solid transparent`,
          borderTop: `${size * 0.3}px solid ${borderColor}`,
          marginTop: '-2px'
        }}
      />
    </div>
  )
}

export { IconPin, TextPin, ImagePin }
