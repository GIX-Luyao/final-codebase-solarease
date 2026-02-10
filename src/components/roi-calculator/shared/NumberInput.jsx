import React, { useCallback } from 'react'
import './NumberInput.css'

export default function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  placeholder,
  className = ''
}) {
  const numValue = parseFloat(value) || 0
  const numStep = parseFloat(step) || 1

  const increment = useCallback(() => {
    if (disabled) return
    let newValue = numValue + numStep
    if (max !== undefined) newValue = Math.min(newValue, max)
    // Round to avoid floating point issues
    newValue = Math.round(newValue * 1000) / 1000
    onChange({ target: { value: newValue } })
  }, [numValue, numStep, max, disabled, onChange])

  const decrement = useCallback(() => {
    if (disabled) return
    let newValue = numValue - numStep
    if (min !== undefined) newValue = Math.max(newValue, min)
    // Round to avoid floating point issues
    newValue = Math.round(newValue * 1000) / 1000
    onChange({ target: { value: newValue } })
  }, [numValue, numStep, min, disabled, onChange])

  return (
    <div className={`number-input ${className}`}>
      <input
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
      />
      <div className="number-controls">
        <button
          type="button"
          className="number-btn increment"
          onClick={increment}
          disabled={disabled || (max !== undefined && numValue >= max)}
          tabIndex={-1}
          aria-label="Increment"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          type="button"
          className="number-btn decrement"
          onClick={decrement}
          disabled={disabled || (min !== undefined && numValue <= min)}
          tabIndex={-1}
          aria-label="Decrement"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </div>
  )
}
