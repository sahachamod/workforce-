"use client"

import * as React from "react"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className="px-3 py-2 border rounded-md w-full"
    >
      {children}
    </select>
  )
}

const SelectTrigger = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
)

const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>

const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value}>{children}</option>
)

const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }