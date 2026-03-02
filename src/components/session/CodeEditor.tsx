import { useCallback, useMemo, useRef, useState } from 'react'

type CodeEditorProps = {
  value: string
  onChange: (value: string) => void
  highlightedLines: number[]
  proposedLines: number[]
  readOnly?: boolean
  onRunRequested?: () => void
  onEscape?: () => void
}

const INDENT = '  '
const LINE_HEIGHT = 24
const CONTENT_PADDING_Y = 12

function getLineNumberFromOffset(text: string, offset: number) {
  return text.slice(0, Math.max(0, offset)).split('\n').length
}

function getLineStart(text: string, offset: number) {
  return text.lastIndexOf('\n', Math.max(0, offset) - 1) + 1
}

function getOutdentCount(line: string) {
  if (line.startsWith('\t')) {
    return 1
  }
  if (line.startsWith('  ')) {
    return 2
  }
  if (line.startsWith(' ')) {
    return 1
  }
  return 0
}

export function CodeEditor({
  value,
  onChange,
  highlightedLines,
  proposedLines,
  readOnly = false,
  onRunRequested,
  onEscape,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const gutterRef = useRef<HTMLOListElement | null>(null)

  const [activeLine, setActiveLine] = useState(1)
  const [scrollTop, setScrollTop] = useState(0)

  const lines = useMemo(() => value.split('\n'), [value])
  const activeLineTop = CONTENT_PADDING_Y + (activeLine - 1) * LINE_HEIGHT - scrollTop

  const syncSelection = useCallback((nextValue: string, nextStart: number, nextEnd: number) => {
    onChange(nextValue)

    window.requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return
      }

      textareaRef.current.setSelectionRange(nextStart, nextEnd)
      setActiveLine(getLineNumberFromOffset(nextValue, nextStart))
    })
  }, [onChange])

  const updateActiveLineFromTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    setActiveLine(getLineNumberFromOffset(textarea.value, textarea.selectionStart))
  }, [])

  const indentSelection = useCallback((textarea: HTMLTextAreaElement) => {
    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const text = textarea.value

    if (selectionStart === selectionEnd) {
      const nextText = `${text.slice(0, selectionStart)}${INDENT}${text.slice(selectionEnd)}`
      const caret = selectionStart + INDENT.length
      syncSelection(nextText, caret, caret)
      return
    }

    const blockStart = getLineStart(text, selectionStart)
    const selectedBlock = text.slice(blockStart, selectionEnd)
    const blockLines = selectedBlock.split('\n')
    const indentedBlock = blockLines.map((line) => `${INDENT}${line}`).join('\n')

    const nextText = `${text.slice(0, blockStart)}${indentedBlock}${text.slice(selectionEnd)}`
    const nextStart = selectionStart + INDENT.length
    const nextEnd = selectionEnd + blockLines.length * INDENT.length
    syncSelection(nextText, nextStart, nextEnd)
  }, [syncSelection])

  const outdentSelection = useCallback((textarea: HTMLTextAreaElement) => {
    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const text = textarea.value

    const blockStart = getLineStart(text, selectionStart)
    const selectedBlock = text.slice(blockStart, selectionEnd)
    const blockLines = selectedBlock.split('\n')

    const removedPerLine: number[] = []
    const outdentedBlock = blockLines
      .map((line) => {
        const removed = getOutdentCount(line)
        removedPerLine.push(removed)
        return line.slice(removed)
      })
      .join('\n')

    const totalRemoved = removedPerLine.reduce((sum, removed) => sum + removed, 0)
    const removedOnStartLine = Math.min(removedPerLine[0] ?? 0, selectionStart - blockStart)

    const nextText = `${text.slice(0, blockStart)}${outdentedBlock}${text.slice(selectionEnd)}`
    const nextStart = Math.max(blockStart, selectionStart - removedOnStartLine)
    const nextEnd = Math.max(nextStart, selectionEnd - totalRemoved)

    syncSelection(nextText, nextStart, nextEnd)
  }, [syncSelection])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onRunRequested?.()
      return
    }

    if (event.key === 'Escape') {
      if (onEscape) {
        event.preventDefault()
        onEscape()
      }
      return
    }

    if (readOnly || event.key !== 'Tab') {
      return
    }

    event.preventDefault()

    if (event.shiftKey) {
      outdentSelection(textarea)
      return
    }

    indentSelection(textarea)
  }, [indentSelection, onEscape, onRunRequested, outdentSelection, readOnly])

  return (
    <div className="overflow-hidden rounded-xl border border-pebble-border/35 bg-[var(--pebble-editor-bg)]">
      <div className="grid grid-cols-[60px_1fr]">
        <ol
          ref={gutterRef}
          aria-hidden="true"
          className="max-h-[430px] overflow-y-auto border-r border-pebble-border/20 bg-[var(--pebble-editor-gutter)] py-3 text-right text-xs text-pebble-text-muted"
        >
          {lines.map((_, index) => {
            const lineNumber = index + 1
            const isActive = lineNumber === activeLine
            const isHighlighted = highlightedLines.includes(lineNumber)
            const isProposed = proposedLines.includes(lineNumber)

            return (
              <li
                key={lineNumber}
                className={`h-6 px-3 leading-6 ${
                  isHighlighted
                    ? 'bg-pebble-accent/20 text-pebble-text-primary'
                    : isProposed
                      ? 'bg-pebble-accent/10 text-pebble-text-secondary ring-1 ring-inset ring-pebble-accent/30'
                      : isActive
                        ? 'bg-pebble-overlay/16 text-pebble-text-primary'
                        : ''
                }`}
              >
                {lineNumber}
              </li>
            )
          })}
        </ol>

        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-0 h-6 bg-pebble-overlay/12"
            style={{ top: activeLineTop }}
          />

          <textarea
            ref={textareaRef}
            value={value}
            readOnly={readOnly}
            wrap="off"
            spellCheck={false}
            onChange={(event) => {
              onChange(event.target.value)
              updateActiveLineFromTextarea(event.currentTarget)
            }}
            onClick={(event) => updateActiveLineFromTextarea(event.currentTarget)}
            onFocus={(event) => updateActiveLineFromTextarea(event.currentTarget)}
            onSelect={(event) => updateActiveLineFromTextarea(event.currentTarget)}
            onKeyUp={(event) => updateActiveLineFromTextarea(event.currentTarget)}
            onKeyDown={handleKeyDown}
            onScroll={(event) => {
              const nextScrollTop = event.currentTarget.scrollTop
              setScrollTop(nextScrollTop)
              if (gutterRef.current) {
                gutterRef.current.scrollTop = nextScrollTop
              }
            }}
            className="relative z-10 max-h-[430px] min-h-[430px] w-full resize-none overflow-auto bg-transparent p-3 font-mono text-sm leading-6 text-pebble-text-secondary outline-none placeholder:text-pebble-text-muted focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
            aria-label="Session code editor"
          />
        </div>
      </div>
    </div>
  )
}
