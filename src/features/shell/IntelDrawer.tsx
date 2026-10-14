import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react'

interface IntelDrawerProps {
  label: string
  className?: string
  onClose: () => void
  children: ReactNode
}

/** Shared modal contract for player intelligence and current-user details. */
export default function IntelDrawer({ label, className = '', onClose, children }: IntelDrawerProps) {
  const backdrop = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const dismiss = useEffectEvent(onClose)

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const surface = panel.current
    const overlay = backdrop.current
    if (!surface || !overlay) return

    const siblings = Array.from(overlay.parentElement?.children ?? [])
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node !== overlay)
      .map((node) => ({ node, inert: node.inert }))
    siblings.forEach(({ node }) => { node.inert = true })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function controls() {
      return Array.from(surface!.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      )).filter((node) => !node.closest('[hidden]') && getComputedStyle(node).display !== 'none')
    }
    const first = controls()[0] ?? surface
    first.focus({ preventScroll: true })

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismiss()
      } else if (event.key === 'Tab') {
        const items = controls()
        const firstItem = items[0] ?? surface!
        const lastItem = items.at(-1) ?? surface!
        if (!surface!.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === firstItem) ||
          (!event.shiftKey && document.activeElement === lastItem)) {
          event.preventDefault()
          ;(event.shiftKey ? lastItem : firstItem).focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      siblings.forEach(({ node, inert }) => { node.inert = inert })
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div ref={backdrop} className="drawer-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <aside ref={panel} className={`intel-drawer ${className}`} role="dialog"
        aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </aside>
    </div>
  )
}
