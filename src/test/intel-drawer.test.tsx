import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import IntelDrawer from '../features/shell/IntelDrawer'

function Example() {
  const [open, setOpen] = useState(false)
  return <div>
    <main><button onClick={() => setOpen(true)}>Open intel</button></main>
    {open && <IntelDrawer label="Intel fixture" onClose={() => setOpen(false)}>
      <button onClick={() => setOpen(false)}>Close intel</button>
      <a href="#evidence">Evidence</a>
    </IntelDrawer>}
  </div>
}

afterEach(cleanup)

describe('shared intelligence drawer', () => {
  it('enters focus, makes the background inert and restores focus/scroll on Escape', () => {
    render(<Example />)
    const opener = screen.getByRole('button', { name: 'Open intel' })
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('button', { name: 'Close intel' })).toHaveFocus()
    expect(document.querySelector('main')!.inert).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(document.querySelector('main')!.inert).not.toBe(true)
    expect(document.body.style.overflow).toBe('')
  })

  it('wraps forward and reverse Tab within the drawer', () => {
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'Open intel' }))
    const drawer = screen.getByRole('dialog')
    const close = within(drawer).getByRole('button')
    const last = within(drawer).getByRole('link')
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(close).toHaveFocus()
  })

  it('dismisses from the backdrop but not from the panel', () => {
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'Open intel' }))
    const drawer = screen.getByRole('dialog')
    fireEvent.click(drawer)
    expect(drawer).toBeInTheDocument()
    fireEvent.click(drawer.parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
