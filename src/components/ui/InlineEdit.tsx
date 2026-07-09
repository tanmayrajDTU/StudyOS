'use client'

import React, { useState, useEffect, useRef } from 'react'

interface InlineEditProps {
  value: string
  onSave: (newValue: string) => void | Promise<void>
  className?: string
  inputClassName?: string
  placeholder?: string
  type?: 'text' | 'number'
}

export function InlineEdit({
  value,
  onSave,
  className = '',
  inputClassName = '',
  placeholder = 'Click to edit...',
  type = 'text',
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const trimmed = localValue.trim()
    if (trimmed === '') {
      setLocalValue(value)
      setIsEditing(false)
      return
    }
    if (trimmed !== value) {
      await onSave(trimmed)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setLocalValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`bg-secondary border border-primary/30 rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:border-primary w-full text-sm font-medium ${inputClassName}`}
      />
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-text hover:bg-secondary/40 rounded px-1.5 py-0.5 transition-all ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground/60 italic">{placeholder}</span>}
    </div>
  )
}
