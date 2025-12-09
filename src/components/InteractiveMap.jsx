import React, { useState, useRef } from 'react'
import './InteractiveMap.css'

// A lightweight stylized SVG map with interactive regions.
// This component does not rely on external map libs — it provides clickable regions, hover tooltip,
// keyboard focus, and calls `onSelectLocation(id)` on click/enter.
export default function InteractiveMap({ selectedLocation, onSelectLocation }){
  const [hover, setHover] = useState(null)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)

  // pan/zoom state
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const panState = useRef({ active: false, startClient: null, startSvg: null, startTx: 0, startTy: 0 })

  // Approximate Washington state border (simplified) and small region markers placed inside.
  // The path is simplified to suggest state borders at a glance.
  // Improved (still simplified) Washington outline path to better suggest state borders
  const statePath = `M12,58
    C28,30 58,20 88,24
    C120,28 150,20 180,28
    C210,36 240,28 268,34
    C300,42 328,64 344,72
    L344,142
    C320,138 300,146 280,150
    C248,154 220,152 192,150
    C160,148 132,156 100,152
    C72,148 44,140 24,132
    C16,122 12,86 12,58 Z`

  const regions = [
    { id: 'Quincy, WA', name: 'Quincy', x: 112, y: 64 },
    { id: 'East Wenatchee, WA', name: 'East Wenatchee', x: 200, y: 46 },
    { id: 'Malaga, WA', name: 'Malaga', x: 175, y: 104 },
    { id: 'Yakima, WA', name: 'Yakima', x: 250, y: 108 }
  ]

  // helper to get client coordinates for tooltip; use clientX/Y for accurate fixed positioning
  function handlePointer(e, region){
    setTipPos({ x: e.clientX, y: e.clientY })
    setHover(region)
  }
  function clearPointer(){ setHover(null) }

  function onKeyDown(e, id){ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectLocation(id) } }

  // Convert screen point to SVG user coordinates
  function screenToSvgPoint(clientX, clientY){
    const svg = svgRef.current
    if(!svg) return { x: clientX, y: clientY }
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse())
    return loc
  }

  function handleWheel(e){
    e.preventDefault()
    const svg = svgRef.current
    if(!svg) return
    const delta = -e.deltaY
    const zoomFactor = delta > 0 ? 1.08 : 0.92
    const newScale = Math.max(0.6, Math.min(3, scale * zoomFactor))

    // zoom around mouse pointer
    const loc = screenToSvgPoint(e.clientX, e.clientY)
    const newTx = loc.x - (loc.x - tx) * (newScale / scale)
    const newTy = loc.y - (loc.y - ty) * (newScale / scale)
    setScale(newScale)
    setTx(newTx)
    setTy(newTy)
  }

  function handlePointerDown(e){
    const svg = svgRef.current
    if(!svg) return
    // Don't start panning if the pointerdown happened on an interactive region element
    try{
      const tgt = e.target
      if(tgt && tgt.closest && tgt.closest('.region')){
        return
      }
    }catch(_){ }

    svg.setPointerCapture(e.pointerId)
    const startSvg = screenToSvgPoint(e.clientX, e.clientY)
    panState.current = { active: true, pointerId: e.pointerId, startClient: { x: e.clientX, y: e.clientY }, startSvg, startTx: tx, startTy: ty }
  }

  function handlePointerMove(e){
    if(!panState.current.active || panState.current.pointerId !== e.pointerId) return
    const svg = svgRef.current
    if(!svg) return
    const curSvg = screenToSvgPoint(e.clientX, e.clientY)
    const dx = curSvg.x - panState.current.startSvg.x
    const dy = curSvg.y - panState.current.startSvg.y
    setTx(panState.current.startTx + dx)
    setTy(panState.current.startTy + dy)
  }

  function handlePointerUp(e){
    const svg = svgRef.current
    if(svg && panState.current.pointerId === e.pointerId){
      try{ svg.releasePointerCapture(e.pointerId) }catch(_){}
    }
    panState.current.active = false
  }

  return (
    <div className="interactive-map v2">
      <svg ref={svgRef} viewBox="0 0 360 180" className="map-svg" role="img" aria-label="Interactive map of locations"
        onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
        <defs>
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.12" />
          </filter>
        </defs>

        <rect x="0" y="0" width="100%" height="100%" fill="transparent" />

        {/* Washington state base */}
        <g className="viewport" transform={`translate(${tx},${ty}) scale(${scale})`}>
          <path d={statePath} className="state-fill" />

          {regions.map(r=>{
            const active = selectedLocation === r.id
            return (
              <g key={r.id} className={`region ${active? 'active':''}`} tabIndex={0}
                transform={`translate(${r.x}, ${r.y})`}
                onMouseEnter={(e)=>handlePointer(e, r)} onMouseMove={(e)=>handlePointer(e, r)} onMouseLeave={clearPointer}
                onFocus={(e)=>handlePointer(e, r)} onBlur={clearPointer}
                onClick={()=>onSelectLocation(r.id)} onKeyDown={(e)=>onKeyDown(e, r.id)} role="button" aria-pressed={active}>
                <circle cx={0} cy={0} r="6" className="region-dot" />
                <text x={10} y={4} className="region-label">{r.name}</text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="map-hint">Click a region to load location defaults — drag to pan, use wheel to zoom</div>

      {hover && (
        <div className="map-tooltip" style={{ left: tipPos.x + 12, top: tipPos.y - 8 }}>
          <div className="tt-title">{hover.name}</div>
          <div className="tt-sub">Click to select — updates simulator</div>
        </div>
      )}
    </div>
  )
}
