'use client'

import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import preprocessorConfig from '@/config/preprocessor_config.json'

interface ContentRendererProps {
  id?: string
  text?: string
  images?: string[]
  tables?: Array<{ headers?: string[]; rows?: string[][] }>
}

function cleanMathematicalText(rawText: string, questionId?: string): string {
  if (!rawText) return ''

  // 1. Targeted overrides for badly extracted formulas in GATE Combinatorics & Algorithms
  if (questionId) {
    if (questionId.startsWith('DM_COMBINATORICS_2023_Q01')) {
      if (questionId.endsWith('_B')) return '\\( \\binom{n-2k}{k} (n-2k)! \\)'
      if (questionId.endsWith('_C')) return '\\( \\binom{n-2k}{k} (k!)^2 \\)'
      if (questionId.endsWith('_D')) return '\\( \\binom{n-2k}{k} (n-2k)! (k!)^2 \\)'
    }
    if (questionId.startsWith('DM_COMBINATORICS_2008_Q06')) {
      if (questionId.endsWith('_A')) return '\\( \\binom{n+b-1}{b} \\binom{n+r-1}{r} \\)'
      if (questionId.endsWith('_B')) return '\\( \\binom{n+b-1}{b} + \\binom{n+r-1}{r} \\)'
      if (questionId.endsWith('_C')) return '\\( \\frac{n!}{b!r!} \\)'
      if (questionId.endsWith('_D')) return '\\( \\binom{n}{b} \\binom{n}{r} \\)'
    }
    if (questionId === 'DM_COMBINATORICS_2015_Q08') {
      return '\\( \\sum_{x=1}^{99} \\frac{1}{x(x+1)} = \\) ____'
    }
    if (questionId === 'DM_COMBINATORICS_2017_Q12') {
      return 'If the ordinary generating function of a sequence \\( \\{a_n\\}_{n=0}^{\\infty} \\) is \\( \\frac{1+z}{(1-z)^3} \\), then \\( a_3 - a_0 \\) is equal to ____.'
    }
    if (questionId.startsWith('DM_COMBINATORICS_2023_Q13')) {
      if (questionId.endsWith('_A')) return '\\( L_n = \\left(\\frac{1+\\sqrt{5}}{2}\\right)^n + \\left(\\frac{1-\\sqrt{5}}{2}\\right)^n \\)'
      if (questionId.endsWith('_B')) return '\\( L_n = \\left(\\frac{1+\\sqrt{5}}{2}\\right)^n - \\left(\\frac{1-\\sqrt{5}}{2}\\right)^n \\)'
      if (questionId.endsWith('_C')) return '\\( L_n = \\left(\\frac{1+\\sqrt{5}}{2}\\right)^{n-1} + \\left(\\frac{1-\\sqrt{5}}{2}\\right)^{n-1} \\)'
      if (questionId.endsWith('_D')) return '\\( L_n = \\left(\\frac{1+\\sqrt{5}}{2}\\right)^{n-1} - \\left(\\frac{1-\\sqrt{5}}{2}\\right)^{n-1} \\)'
    }
    if (questionId === 'ALGO_ASYMPTOTIC_ANALYSIS_2021_Q04') {
      return 'Which of the given options provides the increasing order of asymptotic complexity of functions \\( f_1, f_2, f_3 \\) and \\( f_4 \\)?\n\n' +
             '\\( f_1(n) = 2^n \\)\n' +
             '\\( f_2(n) = n^{3/2} \\)\n\n' +
             '\\( f_3(n) = n \\log_2 n \\)\n' +
             '\\( f_4(n) = n^{\\log_2 n} \\)'
    }
  }

  // 2. Self-healing preprocessor for vertical layout extractions and font characters
  let clean = rawText

  // Wrap floor and ceiling brackets in LaTeX syntax BEFORE replacing single characters
  clean = clean.replace(/([^]+)/g, '\\( \\lfloor $1 \\rfloor \\)')
  clean = clean.replace(/([^]+)/g, '\\( \\lceil $1 \\rceil \\)')

  // Match asymptotic complexity function powers e.g., f(n2) -> f(n^2), (n)2 -> (n)^2
  clean = clean.replace(/\b(n|x|y|\))2\b/g, '\\( $1^2 \\)')

  // Translate Symbol/MT Extra font characters to standard symbols/LaTeX equivalents
  clean = clean.replace(//g, ' \\{a_n\\}_{n=0}^{\\infty} ')
  clean = clean.replace(//g, '{').replace(//g, '}')
  clean = clean.replace(//g, '\\infty')
  clean = clean.replace(//g, '\\emptyset')
  clean = clean.replace(//g, '\\cap')
  clean = clean.replace(//g, '\\subseteq')
  clean = clean.replace(//g, '\\cup')
  clean = clean.replace(//g, '\\in')
  clean = clean.replace(//g, '\\notin')
  clean = clean.replace(//g, '\\therefore')

  // Apply other Symbol/MT Extra font mappings dynamically from preprocessor_config.json
  Object.entries(preprocessorConfig.mappings).forEach(([char, replacement]) => {
    // Skip characters that require special custom regex logic above
    if (['', '', '', '', '', '', '', '', '', '', ''].includes(char)) return
    
    const escapedChar = char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    clean = clean.replace(new RegExp(escapedChar, 'g'), replacement)
  })

  clean = clean.replace(//g, '\\cong ')
  clean = clean.replace(//g, '\\Phi ')
  clean = clean.replace(//g, '< ')
  clean = clean.replace(//g, '> ')

  // Remove parenthesis formatting glyph structures
  clean = clean.replace(/[]/g, '')

  // Preprocess spacing subscripts (e.g. matching `a\nn`, `a\nn-1` and merging them)
  clean = clean.replace(/([a-zA-Z])\n\s*([0-9a-zA-Z\-+−]+)/g, '$1$2')

  // Convert standard variable suffixes to LaTeX subscript expressions (e.g. an -> a_n, an-1 -> a_{n-1})
  clean = clean.replace(/\b([a-zA-Z])(n|k|i)([+\-−]\d+)?\b/g, '\\( $1_{$2$3} \\)')

  // Transform raw exponential terms to LaTeX superscript format (e.g. 2n-2 -> 2^{n-2})
  clean = clean.replace(/\b2(n|k)([+\-−]\d+)\b/g, '\\( 2^{$1$2} \\)')
  clean = clean.replace(/\b2n[+\-−]?\b/g, '\\( 2^n \\)')

  // Parse lines to intelligently collapse vertical math fragments
  const lines = clean.split('\n')
  const processedLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Preserve double newlines (empty lines)
    if (line === '') {
      processedLines.push('')
      continue
    }

    // Determine if the line is a very short fragment (less than 15 chars)
    const isFragment = line.length <= 15 || 
      /^[0-9a-zA-Z\s\+\-\*\/\=\!\(\)\{\}\[\]\<\>\,\.\:\;\\_\\^]+$/.test(line)

    if (processedLines.length > 0) {
      const lastIdx = processedLines.length - 1
      const prevLine = processedLines[lastIdx].trim()

      const prevIsFragment = prevLine.length <= 15
      const startsWithOperator = /^[+\-*/=!,).:;\]}]/.test(line)
      const endsWithOperator = /[+\-*/=!(,.:;\[{]$/.test(prevLine)

      if (prevLine !== '' && (endsWithOperator || startsWithOperator || (prevIsFragment && isFragment))) {
        const needsSpace = /\w$/.test(prevLine) && /^\w/.test(line)
        processedLines[lastIdx] = prevLine + (needsSpace ? ' ' : '') + line
        continue
      }
    }

    processedLines.push(line)
  }

  // Filter out excessive empty lines and join
  return processedLines
    .filter((line, idx, arr) => line !== '' || (idx > 0 && arr[idx - 1] !== ''))
    .join('\n')
}

export default function ContentRenderer({ id, text = '', images = [], tables = [] }: ContentRendererProps) {
  // Preprocess text
  const cleanText = cleanMathematicalText(text, id)

  // Helper to render text containing LaTeX formulas
  const renderLatexText = (rawText: string) => {
    if (!rawText) return null

    // Regex to find math blocks: $$...$$, \[...\], $...$, \(...\)
    const mathRegex = /(\$\$[^\$]+\$\$|\\\[[\s\S]+?\\\]|\$[^\$]+\$|\\\([\s\S]+?\\\)|\\[a-zA-Z]+(?:\{[^\}]+\})*)/g

    const parts = rawText.split(mathRegex)
    
    return parts.map((part, index) => {
      if (!part) return null

      // Check if block math: $$...$$ or \[...\]
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const formula = part.slice(2, -2)
        try {
          const html = katex.renderToString(formula, { displayMode: true, throwOnError: false })
          return <div key={index} className="my-3 overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: html }} />
        } catch {
          return <code key={index} className="block text-center my-2 font-mono text-xs">{formula}</code>
        }
      }
      
      if (part.startsWith('\\[') && part.endsWith('\\]')) {
        const formula = part.slice(2, -2)
        try {
          const html = katex.renderToString(formula, { displayMode: true, throwOnError: false })
          return <div key={index} className="my-3 overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: html }} />
        } catch {
          return <code key={index} className="block text-center my-2 font-mono text-xs">{formula}</code>
        }
      }

      // Check if inline math: $...$ or \(...\)
      if (part.startsWith('$') && part.endsWith('$')) {
        const formula = part.slice(1, -1)
        try {
          const html = katex.renderToString(formula, { displayMode: false, throwOnError: false })
          return <span key={index} className="mx-0.5 inline-block" dangerouslySetInnerHTML={{ __html: html }} />
        } catch {
          return <code key={index} className="mx-0.5 font-mono text-xs">{formula}</code>
        }
      }

      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        const formula = part.slice(2, -2)
        try {
          const html = katex.renderToString(formula, { displayMode: false, throwOnError: false })
          return <span key={index} className="mx-0.5 inline-block" dangerouslySetInnerHTML={{ __html: html }} />
        } catch {
          return <code key={index} className="mx-0.5 font-mono text-xs">{formula}</code>
        }
      }

      // Fallback: If it starts with a backslash, it could be a single command like \le or \pi
      if (part.startsWith('\\')) {
        try {
          const html = katex.renderToString(part, { displayMode: false, throwOnError: false })
          return <span key={index} className="mx-0.5 inline-block" dangerouslySetInnerHTML={{ __html: html }} />
        } catch {
          return <span key={index}>{part}</span>
        }
      }

      // Regular text Segment
      return (
        <span key={index} className="whitespace-pre-line leading-relaxed">
          {part}
        </span>
      )
    })
  }

  return (
    <div className="space-y-4 text-sm md:text-base text-foreground/90 font-sans">
      {/* Render Text */}
      {cleanText && <div className="leading-relaxed">{renderLatexText(cleanText)}</div>}

      {/* Render Images */}
      {images && images.length > 0 && (
        <div className="flex flex-col gap-3 my-4">
          {images.map((img, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden border border-border/60 bg-secondary/10 p-2 max-w-2xl mx-auto shadow-xs">
              <img
                src={img.startsWith('/') || img.startsWith('http') ? img : `/pyq-dataset/${img}`}
                alt={`Figure ${idx + 1}`}
                className="max-h-[350px] object-contain mx-auto"
              />
            </div>
          ))}
        </div>
      )}

      {/* Render Tables */}
      {tables && tables.length > 0 && (
        <div className="overflow-x-auto my-4 border border-border/50 rounded-xl shadow-2xs">
          {tables.map((table, tIdx) => (
            <table key={tIdx} className="min-w-full divide-y divide-border text-xs md:text-sm text-left">
              {table.headers && table.headers.some(h => h.trim() !== '') && (
                <thead className="bg-secondary/40 font-bold font-mono text-muted-foreground uppercase text-3xs tracking-wider">
                  <tr>
                    {table.headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-4 py-3 font-semibold">{renderLatexText(cleanMathematicalText(h, id))}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-border/40 bg-card">
                {table.rows && table.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-secondary/15 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 whitespace-nowrap text-foreground">{renderLatexText(cleanMathematicalText(cell, id))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      )}
    </div>
  )
}
