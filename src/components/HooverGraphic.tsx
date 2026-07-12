import type { CSSProperties } from 'react'

interface HooverGraphicProps {
  showBar?: boolean
  className?: string
}

export function HooverGraphic({ showBar = false, className = '' }: HooverGraphicProps) {
  const codeBlocks = Array.from({ length: 9 }, (_, index) => {
    const column = index % 5
    const row = index % 3
    return {
      index,
      style: {
        '--code-index': index,
        '--code-x': `${0.25 + column * 2.15}rem`,
        '--code-y': `${0.2 + row * 1.15}rem`,
        '--code-dx': `${5.8 - column * 1.35}rem`,
        '--code-dy': `${3.2 - row * 0.6}rem`,
      } as CSSProperties,
    }
  })

  return (
    <div className={`flex w-full max-w-xs flex-col items-center gap-5 px-8 text-center ${className}`}>
      <div className="loading-splash-stage" aria-hidden="true">
        <div className="loading-splash-codes">
          {codeBlocks.map(({ index, style }) => <span key={index} style={style} />)}
        </div>
        <img className="code-hoover-logo loading-splash-logo" src="/favicon.svg" alt="" />
      </div>
      <div className="space-y-3">
        <p className="m-0 text-2xl font-black uppercase tracking-[0.14em]">Code Hoover 2.0</p>
        {showBar && <div className="loading-splash-bar" />}
      </div>
    </div>
  )
}
