import { useId } from 'react'

const svgId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '')

export type ScreenPalette = 'violet' | 'blue' | 'ember' | 'silver' | 'night'

const palettes: Record<ScreenPalette, { sky: [string, string, string]; accent: string; body: string; glow: string }> = {
  violet: { sky: ['#2a0b5c', '#5b1ec4', '#0b0a2a'], accent: '#ff4fd8', body: '#1a1f2e', glow: '#7b3dff' },
  blue: { sky: ['#0a1a3e', '#1f4fb8', '#060c1d'], accent: '#7dc4ff', body: '#1b2130', glow: '#2b7bff' },
  ember: { sky: ['#3b1a10', '#d0662a', '#1a0c08'], accent: '#ffc274', body: '#1e2230', glow: '#ff7a2f' },
  silver: { sky: ['#1b2230', '#3f4c63', '#0c1018'], accent: '#c9d6ea', body: '#4a5161', glow: '#8aa4c8' },
  night: { sky: ['#06101f', '#173a73', '#04070d'], accent: '#4f9bff', body: '#12161f', glow: '#2a6dff' },
}

/** Front-facing open laptop with a stylised wallpaper. */
export function OpenLaptopArt({ palette = 'blue', className = '' }: { palette?: ScreenPalette; className?: string }) {
  const id = svgId(useId())
  const u = (name: string) => `url(#${id}-${name})`
  const colors = palettes[palette]
  return <svg className={`sf-open-laptop ${className}`} viewBox="0 0 400 250" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={colors.sky[0]} />
        <stop offset=".55" stopColor={colors.sky[1]} />
        <stop offset="1" stopColor={colors.sky[2]} />
      </linearGradient>
      <linearGradient id={`${id}-deck`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={colors.body} />
        <stop offset="1" stopColor="#07090f" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor={colors.glow} stopOpacity=".55" />
        <stop offset="1" stopColor={colors.glow} stopOpacity="0" />
      </radialGradient>
      <clipPath id={`${id}-screen`}><path d="M98 24h204l6 146H92Z" /></clipPath>
    </defs>
    <ellipse cx="200" cy="226" rx="190" ry="20" fill={u('glow')} />
    <path d="M90 16h220a6 6 0 0 1 6 6l6 156H78l6-156a6 6 0 0 1 6-6Z" fill="#0b0e15" stroke="#2c3446" />
    <g clipPath={u('screen')}>
      <rect x="90" y="20" width="220" height="152" fill={u('sky')} />
      {palette === 'violet' && <>
        <path d="M150 140 205 64 214 70 166 140Z" fill={colors.accent} opacity=".85" />
        <path d="M188 76h12l60 64h-14Z" fill="#8f6bff" />
        <path d="M120 150c30-28 70-38 120-30s52 22 70 22v30H90Z" fill="#14082e" opacity=".9" />
      </>}
      {(palette === 'ember' || palette === 'blue' || palette === 'night') && <>
        <circle cx="236" cy="70" r="16" fill={colors.accent} opacity=".7" />
        <path d="M90 136 140 96 170 116 214 82 254 112 284 94 310 108V172H90Z" fill="#000" opacity=".55" />
        <path d="M90 152 130 128 176 146 222 120 266 140 310 126V172H90Z" fill="#000" opacity=".7" />
      </>}
      {palette === 'silver' && <>
        <rect x="112" y="40" width="70" height="44" rx="3" fill="#c9d6ea" opacity=".16" />
        <rect x="190" y="40" width="98" height="96" rx="3" fill="#c9d6ea" opacity=".1" />
        <rect x="112" y="92" width="70" height="44" rx="3" fill="#c9d6ea" opacity=".12" />
      </>}
      <path d="M90 20h220L250 172H90Z" fill="#fff" opacity=".05" />
    </g>
    <path d="M78 178h244l52 34H26Z" fill={u('deck')} stroke="#2e3648" />
    <path d="M96 184h208l22 15H74Z" fill="#05070c" opacity=".7" />
    <path d="M98 187h204M92 191h216M86 195h228" stroke={colors.glow} strokeOpacity=".35" strokeWidth=".8" />
    <path d="M26 212h348l-4 8H30Z" fill="#05070c" stroke="#2a3243" />
    <rect x="168" y="203" width="64" height="7" rx="2" fill="#0b0e15" stroke="#2c3446" strokeWidth=".8" />
  </svg>
}

/** Gaming mouse, headset and keyboard edge, used for the accessories category. */
export function PeripheralsArt() {
  const id = svgId(useId())
  const u = (name: string) => `url(#${id}-${name})`
  return <svg className="sf-open-laptop" viewBox="0 0 400 250" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3b4560" />
        <stop offset=".5" stopColor="#141a28" />
        <stop offset="1" stopColor="#06080e" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#2b7bff" stopOpacity=".5" />
        <stop offset="1" stopColor="#2b7bff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="200" cy="200" rx="200" ry="50" fill={u('glow')} />
    <path d="M0 196 168 160 220 176 54 220 0 222Z" fill="#0b0f18" stroke="#273047" />
    <path d="M20 200 160 170M30 207 176 175M42 213 190 181" stroke="#2f6fe0" strokeOpacity=".4" />
    <path d="M150 108c0-36 22-62 52-62s52 26 52 62v64c0 30-22 48-52 48s-52-18-52-48Z" fill={u('shell')} stroke="#3a4762" />
    <path d="M202 48v54" stroke="#05070c" strokeWidth="3" />
    <rect x="196" y="66" width="12" height="24" rx="6" fill="#2b7bff" />
    <path d="M160 150c10 30 74 30 84 0" stroke="#2b7bff" strokeOpacity=".6" strokeWidth="2" fill="none" />
    <path d="M270 110c0-48 30-78 64-78s64 30 64 78" stroke="#262f43" strokeWidth="12" fill="none" />
    <rect x="262" y="104" width="34" height="64" rx="14" fill={u('shell')} stroke="#3a4762" />
    <rect x="372" y="104" width="34" height="64" rx="14" fill={u('shell')} stroke="#3a4762" />
    <path d="M272 120v32" stroke="#2b7bff" strokeWidth="2" strokeLinecap="round" />
  </svg>
}

/** Neon city backdrop for the gaming promotion. */
export function NeonCityArt() {
  return <svg className="sf-banner-backdrop" viewBox="0 0 600 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="600" height="220" fill="#0b0720" />
    <g opacity=".85">
      <rect x="250" y="40" width="40" height="180" fill="#2a1460" />
      <rect x="296" y="10" width="34" height="210" fill="#1d0f4a" />
      <rect x="336" y="60" width="46" height="160" fill="#311672" />
      <rect x="388" y="24" width="30" height="196" fill="#1a1046" />
      <rect x="424" y="70" width="52" height="150" fill="#2c1666" />
      <rect x="482" y="30" width="36" height="190" fill="#180e40" />
      <rect x="524" y="80" width="76" height="140" fill="#26135a" />
    </g>
    <g fill="#ff4fd8" opacity=".75">
      <rect x="304" y="30" width="3" height="120" />
      <rect x="430" y="90" width="40" height="2" />
      <rect x="490" y="50" width="2" height="90" />
    </g>
    <g fill="#4fb4ff" opacity=".8">
      <rect x="342" y="80" width="34" height="2" />
      <rect x="396" y="40" width="2" height="110" />
      <rect x="532" y="100" width="56" height="2" />
    </g>
  </svg>
}
