'use client'

import React, { useState } from 'react'
import ContentRenderer from './ContentRenderer'
import { Eye, Code, Columns } from 'lucide-react'

interface MarkdownLatexEditorProps {
  id: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  label?: string
  minHeight?: string
}

export default function MarkdownLatexEditor({
  id,
  value,
  onChange,
  placeholder = 'Write math formulas like \\( E=mc^2 \\) or markdown...',
  label,
  minHeight = '140px'
}: MarkdownLatexEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview' | 'split'>('write')

  return (
    <div className="space-y-2.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-2xs font-extrabold uppercase text-muted-foreground font-mono tracking-wider">
            {label}
          </label>
          <div className="flex items-center gap-1 bg-secondary/35 border border-border/40 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('write')}
              className={`px-2.5 py-1 rounded-md text-4xs font-mono font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                mode === 'write'
                  ? 'bg-card text-foreground border border-border shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="h-2.5 w-2.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`px-2.5 py-1 rounded-md text-4xs font-mono font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                mode === 'preview'
                  ? 'bg-card text-foreground border border-border shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="h-2.5 w-2.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('split')}
              className={`px-2.5 py-1 rounded-md text-4xs font-mono font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                mode === 'split'
                  ? 'bg-card text-foreground border border-border shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Columns className="h-2.5 w-2.5" />
              <span>Split</span>
            </button>
          </div>
        </div>
      )}

      <div className={`border border-border/80 rounded-xl overflow-hidden bg-card ${
        mode === 'split' ? 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60' : ''
      }`}>
        {/* Editor Area */}
        {(mode === 'write' || mode === 'split') && (
          <div className="flex flex-col bg-secondary/10">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              style={{ minHeight }}
              className="w-full bg-transparent border-0 rounded-none p-4 text-xs text-foreground focus:outline-none focus:ring-0 font-mono resize-y transition-all placeholder:text-muted-foreground/50 leading-relaxed"
            />
            {mode === 'split' && (
              <div className="bg-secondary/25 border-t border-border/40 px-3 py-1.5 text-[9px] font-mono text-muted-foreground text-right uppercase font-semibold">
                Editor Code
              </div>
            )}
          </div>
        )}

        {/* Live Preview Area */}
        {(mode === 'preview' || mode === 'split') && (
          <div className="flex flex-col bg-card">
            <div 
              style={{ minHeight }} 
              className={`p-4 overflow-y-auto ${mode === 'split' ? 'max-h-[300px]' : ''}`}
            >
              {value.trim() ? (
                <ContentRenderer id={`editor_preview_${id}`} text={value} />
              ) : (
                <p className="text-3xs text-muted-foreground font-mono italic">
                  Nothing to preview. Start typing to see rendering...
                </p>
              )}
            </div>
            {mode === 'split' && (
              <div className="bg-secondary/25 border-t border-border/40 px-3 py-1.5 text-[9px] font-mono text-muted-foreground text-right uppercase font-semibold">
                Live Rendering Preview
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
