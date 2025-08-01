'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X, Edit3 } from 'lucide-react'

interface EditableCellProps {
  value: number
  onSave: (newValue: number) => Promise<void>
  min?: number
  max?: number
  className?: string
  disabled?: boolean
  placeholder?: string
}

export default function EditableCell({
  value,
  onSave,
  min = 0,
  max = 31,
  className = '',
  disabled = false,
  placeholder = '0'
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value.toString())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(value.toString())
  }, [value])

  const handleEdit = () => {
    if (disabled) return
    setIsEditing(true)
    setError('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value.toString())
    setError('')
  }

  const handleSave = async () => {
    const numValue = parseInt(editValue)
    
    // Validation
    if (isNaN(numValue)) {
      setError('Geçerli bir sayı giriniz')
      return
    }
    
    if (numValue < min || numValue > max) {
      setError(`Değer ${min}-${max} arasında olmalıdır`)
      return
    }

    try {
      setIsSaving(true)
      setError('')
      await onSave(numValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Kaydetme hatası:', error)
      setError('Kaydetme işleminde hata oluştu')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
    setError('')
  }

  if (isEditing) {
    return (
      <div className="relative">
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            className={`w-12 px-1 py-0.5 text-xs text-center border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={isSaving}
            placeholder={placeholder}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-0.5 text-green-600 hover:text-green-700 disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-0.5 text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        {error && (
          <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded shadow-sm whitespace-nowrap z-10">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleEdit}
      className={`group flex items-center justify-center min-h-[24px] cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded px-2 py-1 transition-all ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`}
      title="Düzenlemek için tıklayın"
    >
      <span className="text-xs font-medium">{value}</span>
      {!disabled && (
        <Edit3 className="w-3 h-3 text-blue-500 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  )
}