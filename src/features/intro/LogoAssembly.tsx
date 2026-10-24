const pieces = [
  ['part-outline', 'rxb-outline.png'], ['part-bolt', 'rxb-bolt.png'], ['part-circuit', 'rxb-circuit.png'],
  ['part-tagline', 'rxb-tagline.png'], ['part-r', 'rxb-r.png'], ['part-x', 'rxb-x.png'], ['part-b', 'rxb-b.png'],
] as const

export default function LogoAssembly() {
  return <div className="logo-frame assembly-frame" aria-label="RXB logo assembling from its original components">
    <div className="assembly-particles" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
    <div className="assembly-pulse" aria-hidden="true" />
    <svg className="assembly-arcs" viewBox="0 0 973 575" aria-hidden="true"><path d="M95 286Q190 194 296 254T486 296" /><path d="M878 303Q786 211 686 268T487 297" /><path d="M365 489Q402 429 489 426T625 463" /></svg>
    {pieces.map(([className, filename]) => <img className={`assembly-part ${className}`} src={`/assembly-pieces/${filename}`} alt="" aria-hidden="true" key={filename} />)}
    <img className="assembled-logo" src="/rxb-logo-transparent.png" alt="Original RXB Laptops / Tech logo" />
    <span className="logo-sweep assembly-sweep" aria-hidden="true" />
    <div className="assembly-impacts" aria-hidden="true"><i /><i /><i /></div>
  </div>
}
