'use client'

import { useState } from 'react'
import { Delete, Lock } from 'lucide-react'

interface PinPadProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  disabled?: boolean
  className?: string
}

export default function PinPad({ 
  value, 
  onChange, 
  maxLength = 4, 
  disabled = false,
  className = "" 
}: PinPadProps) {
  const handleNumberClick = (number: string) => {
    if (disabled || value.length >= maxLength) return
    onChange(value + number)
  }

  const handleClear = () => {
    if (disabled) return
    onChange('')
  }

  const handleBackspace = () => {
    if (disabled || value.length === 0) return
    onChange(value.slice(0, -1))
  }

  const renderPinDisplay = () => {
    const dots = []
    for (let i = 0; i < maxLength; i++) {
      dots.push(
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-colors ${
            i < value.length
              ? 'bg-blue-600 border-blue-600'
              : 'bg-gray-100 border-gray-300'
          }`}
        />
      )
    }
    return dots
  }

  const numberButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '']
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* PIN Display */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
        <div className="text-center mb-4">
          <Lock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium">PIN Kodunuz</p>
        </div>
        
        <div className="flex justify-center space-x-3">
          {renderPinDisplay()}
        </div>
        
        <div className="text-center mt-3">
          <p className="text-xs text-gray-500">
            {value.length}/{maxLength} haneli PIN kodu
          </p>
        </div>
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3">
        {numberButtons.map((row, rowIndex) => 
          row.map((number, colIndex) => {
            if (number === '') {
              if (rowIndex === 3 && colIndex === 0) {
                // Clear button (sol alt)
                return (
                  <button
                    key={`clear-${rowIndex}-${colIndex}`}
                    type="button"
                    onClick={handleClear}
                    disabled={disabled || value.length === 0}
                    className="h-14 bg-red-100 text-red-600 rounded-xl font-semibold text-lg hover:bg-red-200 active:bg-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Temizle"
                  >
                    C
                  </button>
                )
              } else if (rowIndex === 3 && colIndex === 2) {
                // Backspace button (sağ alt)
                return (
                  <button
                    key={`backspace-${rowIndex}-${colIndex}`}
                    type="button"
                    onClick={handleBackspace}
                    disabled={disabled || value.length === 0}
                    className="h-14 bg-yellow-100 text-yellow-600 rounded-xl font-semibold hover:bg-yellow-200 active:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Geri sil"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                )
              }
              // Empty space
              return <div key={`empty-${rowIndex}-${colIndex}`} />
            }
            
            // Number button
            return (
              <button
                key={number}
                type="button"
                onClick={() => handleNumberClick(number)}
                disabled={disabled || value.length >= maxLength}
                className="h-14 bg-blue-100 text-blue-900 rounded-xl font-bold text-xl hover:bg-blue-200 active:bg-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {number}
              </button>
            )
          })
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || value.length === 0}
          className="py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 active:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Temizle
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className="py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 active:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Delete className="h-4 w-4" />
          Sil
        </button>
      </div>

      {/* Güvenlik Uyarısı */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-amber-800 font-medium mb-1">Güvenlik Uyarısı</p>
            <p className="text-xs text-amber-700">
              PIN kodunuzu sadece size ait cihazlarda girin. Başkalarının görebileceği yerlerde dikkatli olun.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}