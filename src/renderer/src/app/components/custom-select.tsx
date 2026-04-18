import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string | number | null
  onChange: (value: string | number | null) => void
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  className?: string
}

export const Select: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = false,
  clearable = false,
  disabled = false,
  className = ''
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [isOpen, searchable])

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Select Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 rounded-md
          flex items-center justify-between gap-2
          raised-interface border border-faint
          text-left use-transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-subtle'}
          ${isOpen ? 'border-subtle shadow-glass' : ''}
        `}
      >
        <span className="flex-1 truncate text-black dark:text-white">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {clearable && selectedOption && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-second-layer-thin-hover dark:hover:bg-second-layer-thin-hover-dark rounded transition-colors"
              aria-label="Clear selection"
            >
              <X className="size-4 text-black dark:text-white opacity-60" />
            </button>
          )}
          <ChevronDown
            className={`size-4 text-black dark:text-white opacity-60 use-transition ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full use-blur mt-1 rounded-md raised-interface-lg border border-subtle shadow-main overflow-hidden">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-faint">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-input w-full"
              />
            </div>
          )}

          {/* Options List */}
          <ul className="max-h-60 overflow-y-auto scrollbar-hide h-fit space-y-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li key={option.value}>
                  <button
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={`
                      w-full px-3 py-2 text-left
                      flex items-center justify-between
                      use-transition
                      rounded-sm
                      hover:shadow-glass
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-second-layer-thin-hover dark:hover:bg-second-layer-thin-hover-dark'}
                      ${value === option.value ? 'bg-green-500/20 shadow-glass' : 'border-l-2 border-transparent'}
                      text-black dark:text-white
                    `}
                  >
                    {option.label}
                    {value === option.value && <Check className="size-4 text-green-500" />}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-center text-black dark:text-white opacity-50">
                No options found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
