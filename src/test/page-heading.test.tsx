import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PageHeading, { type PageTitle } from '../features/shell/PageHeading'
import war from '../../public/assets/forged/war.svg?raw'
import targets from '../../public/assets/forged/targets.svg?raw'
import hospital from '../../public/assets/forged/hospital.svg?raw'
import travel from '../../public/assets/forged/travel.svg?raw'
import team from '../../public/assets/forged/team.svg?raw'

const artwork = { WAR: war, TARGETS: targets, HOSPITAL: hospital, TRAVEL: travel, TEAM: team }

afterEach(cleanup)

describe('forged page heading', () => {
  it.each<PageTitle>(['WAR', 'TARGETS', 'HOSPITAL', 'TRAVEL', 'TEAM'])(
    'keeps %s as a semantic heading and bundles valid original vector artwork', title => {
      const { container } = render(<PageHeading title={title} kicker="INTELLIGENCE" />)
      const heading = screen.getByRole('heading', { name: title, level: 1 })
      const image = container.querySelector('h1 img')!
      expect(image).toHaveAttribute('src', `/assets/forged/${title.toLowerCase()}.svg`)
      expect(heading).not.toHaveClass('is-loaded')
      fireEvent.load(image)
      expect(heading).toHaveClass('is-loaded')
      expect(screen.getByRole('heading', { name: title, level: 1 })).toBe(heading)
      const svg = artwork[title]
      expect(svg).toContain(`${title} — original dry-brush lettering`)
      expect(svg).not.toMatch(/NaN|undefined|(?:href|src)=["']https?:/)
    },
  )

  it('restores readable text when an artwork request fails', () => {
    const { container } = render(<PageHeading title="WAR" kicker="RANKED WAR" />)
    const image = container.querySelector('h1 img')!
    fireEvent.load(image)
    fireEvent.error(image)
    expect(screen.getByRole('heading', { name: 'WAR', level: 1 })).not.toHaveClass('is-loaded')
  })

  it('does not retain the previous title load state during navigation', () => {
    const { container, rerender } = render(<PageHeading title="WAR" kicker="RANKED WAR" />)
    fireEvent.load(container.querySelector('h1 img')!)
    rerender(<PageHeading title="HOSPITAL" kicker="OPPORTUNITY WINDOW" />)
    expect(screen.getByRole('heading', { name: 'HOSPITAL', level: 1 })).not.toHaveClass('is-loaded')
  })
})
