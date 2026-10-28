import type { Navigate, Section } from '../navigation'
import { Icon } from './Icon'

type Workspace = Exclude<Section, 'Dashboard'>
const panels: { name: Workspace; description: string; caption: string }[] = [
  { name: 'Products', description: 'The machines at the heart of RXB.', caption: 'Collection workspace' },
  { name: 'Inventory', description: 'A dedicated space for availability.', caption: 'Stock workspace' },
  { name: 'Orders', description: 'A place for the purchase journey.', caption: 'Order workspace' },
  { name: 'Customers', description: 'The people behind every purchase.', caption: 'Customer workspace' },
  { name: 'Reports', description: 'Perspective starts with real data.', caption: 'Reporting workspace' },
]

function PanelIllustration({ name }: { name: Workspace }) {
  return <svg className="bento-illustration" viewBox="0 0 300 160" fill="none" aria-hidden="true">
    {name === 'Products' && <g strokeLinecap="round" strokeLinejoin="round">
      <path className="art-grid" d="m25 124 125-66 125 66-125 32Z M70 102l125 33M111 80l125 33" />
      <g className="art-object"><path d="m63 40 143-18 19 91-139 21Z" fill="#102a46" stroke="#7ba9db" /><path d="m72 47 126-16 16 74-122 18Z" fill="#0a1627" stroke="#345c86" /><path d="m86 134 139-21 44 24-145 22-64-18Z" fill="#193754" stroke="#6d99c7" /><path d="m94 134 128-17 23 13-127 19Z" stroke="#3f6288" /><path d="m152 139 26-4 8 4-26 4Z" stroke="#87a5c7" /></g>
      <path className="art-accent" d="m98 94 30-34 28 27 35-40 M99 104l95-13" /><circle cx="196" cy="43" r="3" fill="#93ceff" />
    </g>}
    {name === 'Inventory' && <g strokeLinejoin="round"><path className="art-grid" d="M34 130h232M53 146h195" /><g className="art-object" stroke="#537ca6"><path d="m65 61 45-24 44 24-44 25Z M65 61v51l45 26 44-26V61M110 86v52" fill="#132d48" /><path d="m151 44 45-24 44 24-44 25Z M151 44v51l45 26 44-26V44M196 69v52" fill="#10233a" /></g><path className="art-accent" d="m88 49 44 25v17M174 32l44 25v17" /><path stroke="#537ca6" d="M253 38v82m-4-82h8m-8 82h8" /></g>}
    {name === 'Orders' && <g><path className="art-grid" d="M40 85h48m124 0h48" strokeDasharray="3 5" /><g className="art-object"><path d="M99 27h80l25 25v87H99Z" fill="#12283f" stroke="#5d86b2" /><path d="M179 27v26h25" stroke="#80b9ef" /><path d="M119 70h62M119 85h44M119 100h54" stroke="#3c6189" /></g><path className="art-accent" d="M127 120h48m-7-6 7 6-7 6" /><circle cx="40" cy="85" r="4" stroke="#6aa5dd" /><circle cx="260" cy="85" r="4" stroke="#6aa5dd" /></g>}
    {name === 'Customers' && <g><ellipse className="art-grid" cx="150" cy="86" rx="110" ry="51" /><path className="art-grid" d="m66 111 84-58 84 58M66 111h168" /><g className="art-object" stroke="#719bc5"><circle cx="150" cy="60" r="18" fill="#152f4c" /><path d="M117 111v-7a33 33 0 0 1 66 0v7" fill="#10253e" /><circle cx="66" cy="111" r="9" fill="#0d2035" /><circle cx="234" cy="111" r="9" fill="#0d2035" /></g><path className="art-accent" d="M137 111h26" /></g>}
    {name === 'Reports' && <g strokeLinejoin="round"><path className="art-grid" d="m52 122 97-48 97 48-97 29Z" /><g className="art-object"><path d="m76 75 91-34 58 61-91 35Z" fill="#0c1e32" stroke="#35597f" /><path d="m76 59 91-34 58 61-91 35Z" fill="#142e49" stroke="#6998c7" /><path d="m92 61 68-25 35 37-68 25Z" stroke="#345b81" /></g><path className="art-accent" d="m111 66 44-16m-34 27 44-16m-34 27 25-9" /></g>}
  </svg>
}

export function BentoWorkspaces({ onNavigate }: { onNavigate: Navigate }) {
  return <div className="workspace-grid bento-grid">
    {panels.map(({ name, description, caption }) => <button key={name} type="button" aria-label={`Open ${name} workspace`} className={`workspace-card bento-panel workspace-card-${name.toLowerCase()}`} onClick={() => onNavigate(name)} data-motion="workspace-card">
      <span className="card-light" aria-hidden="true" />
      <span className="workspace-card-top"><span className="bento-caption"><Icon name={name} />{caption}</span><Icon name="Arrow" /></span>
      <PanelIllustration name={name} />
      <span className="bento-copy"><span className="workspace-card-title">{name}</span><span className="workspace-card-description">{description}</span></span>
      <span className="workspace-card-status"><span />Data unavailable<span className="bento-open" aria-hidden="true">Explore workspace</span></span>
    </button>)}
  </div>
}
