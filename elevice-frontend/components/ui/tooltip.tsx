"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

const Tooltip = ({ children, content, className }: TooltipProps) => {
  return (
    <div className="relative group">
      {children}
      <div className={cn(
        "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-white border border-gray-200 text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none min-w-80",
        className
      )}>
        {content}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45 -mb-1"></div>
      </div>
    </div>
  )
}

export { Tooltip }