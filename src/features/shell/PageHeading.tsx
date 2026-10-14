import { useState, type ReactNode, type CSSProperties } from 'react'

export type PageTitle = 'WAR' | 'TARGETS' | 'HOSPITAL' | 'TRAVEL' | 'TEAM'

function BrushTitle({ title }: { title: PageTitle }) {
  const [loaded, setLoaded] = useState(false)
  const artwork = `/assets/forged/${title.toLowerCase()}.svg`

  return (
    <h1 className={`brush-heading brush-heading--${title.toLowerCase()}${loaded ? ' is-loaded' : ''}`}>
      <span className="brush-heading__text">{title}</span>
      <span className="brush-heading__art" aria-hidden="true"
        style={{ '--brush-art': `url("${artwork}")` } as CSSProperties} />
      <img hidden src={artwork} alt="" aria-hidden="true"
        onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
    </h1>
  )
}

/** Compact forged title; the semantic text also serves as an asset-failure fallback. */
export default function PageHeading({ title, kicker, status, context, action }: {
  title: PageTitle
  kicker: string
  status?: ReactNode
  context?: string
  action?: ReactNode
}) {
  return (
    <section className="screen-heading">
      <div className="screen-heading__content">
        <div className="screen-heading__meta">
          <p className="section-kicker">{kicker}</p>
          <div className="screen-heading__status">{status}{action}</div>
        </div>
        <BrushTitle key={title} title={title} />
        <div className="screen-heading__foot">
          <span>{context ?? 'SCATHE / HONJIN'}</span>
          <span>{String(['WAR', 'TARGETS', 'HOSPITAL', 'TRAVEL', 'TEAM'].indexOf(title) + 1).padStart(2, '0')} / HONJIN</span>
        </div>
      </div>
    </section>
  )
}
