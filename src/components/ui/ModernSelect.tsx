import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, User } from 'lucide-react'

interface Option {
  id: string | number
  label: string
  subtitle?: string
}

interface ModernSelectProps {
  options: Option[]
  value: string | number | null
  onChange: (value: string | number) => void
  placeholder?: string
  searchable?: boolean
  disabled?: boolean
  className?: string
  label?: string
  required?: boolean
  icon?: React.ReactNode
}

export default function ModernSelect({
  options,
  value,
  onChange,
  placeholder = "Seçiniz...",
  searchable = true,
  disabled = false,
  className = "",
  label,
  required = false,
  icon
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const selectRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(option => option.id === value)
  
  const filteredOptions = searchable 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.subtitle && option.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleSelect = (optionId: string | number) => {
    onChange(optionId)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {icon && <span className="inline-block mr-2">{icon}</span>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div ref={selectRef} className="relative">
        {/* Select Button */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`
            relative w-full bg-white border border-gray-300 rounded-xl shadow-sm pl-4 pr-10 py-3 text-left cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            hover:border-gray-400 transition-all duration-200
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
            ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}
          `}
        >
          <div className="flex items-center">
            {icon && !label && <span className="mr-3 text-gray-400">{icon}</span>}
            <div className="flex-1 min-w-0">
              {selectedOption ? (
                <div>
                  <div className="text-gray-900 font-medium">{selectedOption.label}</div>
                  {selectedOption.subtitle && (
                    <div className="text-gray-500 text-sm">{selectedOption.subtitle}</div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </div>
          </div>
          
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown 
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </span>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-80 rounded-xl py-1 overflow-auto border border-gray-200">
            {/* Search */}
            {searchable && (
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ara..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="py-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`
                      relative w-full px-4 py-3 text-left hover:bg-indigo-50 focus:outline-none focus:bg-indigo-50
                      ${value === option.id ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{option.label}</div>
                        {option.subtitle && (
                          <div className="text-gray-500 text-sm">{option.subtitle}</div>
                        )}
                      </div>
                      
                      {value === option.id && (
                        <Check className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  {searchTerm ? 'Sonuç bulunamadı' : 'Seçenek yok'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}