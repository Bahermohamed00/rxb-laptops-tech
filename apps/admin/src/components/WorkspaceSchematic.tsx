const connections = ['m153 185-28 16-45-25H42', 'M307 184l28 16 42-24h40', 'M230 112V72l35-20h50']
export function WorkspaceSchematic() {
  return <div className="workspace-schematic" aria-hidden="true" data-motion="schematic">
    <div className="schematic-perspective"><svg viewBox="0 0 460 340" fill="none">
      <defs><linearGradient id="plane" x1="100" y1="100" x2="360" y2="260" gradientUnits="userSpaceOnUse"><stop stopColor="#183f71" /><stop offset="1" stopColor="#0b1627" /></linearGradient><linearGradient id="edge" x1="100" x2="350" gradientUnits="userSpaceOnUse"><stop stopColor="#183b61" /><stop offset=".5" stopColor="#6dcfff" /><stop offset="1" stopColor="#1a538e" /></linearGradient></defs>
      <g data-part="grid" stroke="#274361" strokeWidth=".7" opacity=".5"><path d="m24 158 206-114 206 114-206 114Z" /><path d="m24 198 206-114 206 114-206 114Z" /><path d="M24 158v40m412-40v40M230 44v40m0 188v40" /><path d="m57 176 173-96 173 96M92 216l173-96M160 254l173-96M126 138l173 96M195 100l173 96" /></g>
      <g data-depth="layer"><g data-part="layer"><path d="m108 190 122-68 122 68v22l-122 68-122-68Z" fill="#091422" stroke="#285680" /><path d="m108 190 122 68 122-68M230 258v22" stroke="#285680" /></g></g>
      <g data-depth="layer"><g data-part="layer"><path d="m108 160 122-68 122 68-122 68Z" fill="url(#plane)" stroke="url(#edge)" /><path d="m108 160 122 68 122-68v12l-122 68-122-68Z" fill="#10223a" stroke="#2b6499" /></g></g>
      <g data-depth="layer"><g data-part="layer"><path d="m146 159 84-46 84 46-84 47Z" fill="#0b1a2d" stroke="#397bb6" /><path d="m159 159 71-39 71 39-71 40Z" stroke="#1d4167" /></g></g>
      <g data-depth="core"><g data-part="core"><path d="m196 154 34-19 34 19-34 19Z" fill="#167aff" fillOpacity=".18" stroke="#68baff" /><path d="m196 154 34 19 34-19v17l-34 19-34-19Z" fill="#0c315c" stroke="#408bc9" /><path d="M230 173v17" stroke="#68baff" /></g></g>
      <g stroke="#5ebaff" strokeWidth="1.4">{connections.map(path => <path key={path} data-part="connection" d={path} strokeDasharray="3 5" />)}</g>
      <g stroke="#a8e5ff" strokeWidth="2" strokeLinecap="round">{connections.map(path => <path key={path} data-part="signal" d={path} opacity="0" />)}</g>
      <g fill="#0c1b2e" stroke="#6cc9ff"><circle data-part="marker" cx="42" cy="176" r="4" /><circle data-part="marker" cx="417" cy="176" r="4" /><circle data-part="marker" cx="315" cy="52" r="4" /></g>
      <g stroke="#426587"><path d="M26 55h12m-6-6v12M416 277h12m-6-6v12M65 280h8m-4-4v8" /></g>
    </svg></div>
    <span className="schematic-label schematic-label-top">Workspace architecture</span><span className="schematic-label schematic-label-bottom"><span />Awaiting connection</span>
  </div>
}

