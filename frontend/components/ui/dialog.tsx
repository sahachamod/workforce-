"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        {children}
      </div>
    </div>
  )
}

const DialogTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
  <div {...props}>{children}</div>
)

const DialogContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
  <div className={cn("", className)} {...props}>{children}</div>
)

const DialogHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
  <div className={cn("mb-4", className)} {...props}>{children}</div>
)

const DialogTitle = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children: React.ReactNode }) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props}>{children}</h2>
)

const DialogDescription = ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { children: React.ReactNode }) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props}>{children}</p>
)

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription }