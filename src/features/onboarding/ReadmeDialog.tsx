import {
  Fragment,
  useEffect,
  type ReactNode,
} from 'react'
import readme from '../../../README.md?raw'

interface ReadmeDialogProps {
  open: boolean
  onClose: () => void
}

function renderInline(
  text: string,
): ReactNode[] {
  const tokens = text.split(
    /(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g,
  )

  return tokens
    .filter(Boolean)
    .map((token, index) => {
      if (
        token.startsWith('**') &&
        token.endsWith('**')
      ) {
        return (
          <strong key={index}>
            {token.slice(2, -2)}
          </strong>
        )
      }

      if (/^https?:\/\//.test(token)) {
        return (
          <a
            key={index}
            href={token}
            target="_blank"
            rel="noreferrer"
          >
            {token}
          </a>
        )
      }

      return (
        <Fragment key={index}>
          {token}
        </Fragment>
      )
    })
}

function renderReadme(): ReactNode[] {
  const blocks: ReactNode[] = []
  let listItems: string[] = []
  let blockIndex = 0

  function flushList() {
    if (listItems.length === 0) {
      return
    }

    const items = listItems
    listItems = []

    blocks.push(
      <ul key={`list-${blockIndex++}`}>
        {items.map((item, index) => (
          <li key={index}>
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    )
  }

  for (const sourceLine of readme.split('\n')) {
    const line = sourceLine.trim()

    if (!line) {
      flushList()
      continue
    }

    if (line.startsWith('- ')) {
      listItems.push(line.slice(2))
      continue
    }

    flushList()

    if (line === '---') {
      blocks.push(
        <hr key={`hr-${blockIndex++}`} />,
      )
      continue
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h4-${blockIndex++}`}>
          {renderInline(line.slice(4))}
        </h4>,
      )
      continue
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={`h3-${blockIndex++}`}>
          {renderInline(line.slice(3))}
        </h3>,
      )
      continue
    }

    if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={`h2-${blockIndex++}`}>
          {renderInline(line.slice(2))}
        </h2>,
      )
      continue
    }

    blocks.push(
      <p key={`p-${blockIndex++}`}>
        {renderInline(line)}
      </p>,
    )
  }

  flushList()
  return blocks
}

export default function ReadmeDialog({
  open,
  onClose,
}: ReadmeDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="readme-overlay">
      <section
        className="readme-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="readme-dialog-title"
      >
        <header className="readme-dialog-header">
          <div>
            <p className="eyebrow">
              SCATHE HONJIN
            </p>
            <h2 id="readme-dialog-title">
              README / ABOUT
            </h2>
          </div>

          <button
            type="button"
            className="readme-close"
            aria-label="Close README"
            onClick={onClose}
            autoFocus
          >
            ×
          </button>
        </header>

        <div className="readme-content">
          {renderReadme()}
        </div>

        <footer className="readme-dialog-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            CLOSE
          </button>
        </footer>
      </section>
    </div>
  )
}
