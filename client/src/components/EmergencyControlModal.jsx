import { useEffect, useState } from 'react'

export default function EmergencyControlModal({ open, onClose, onTrigger, onClear }) {
  const [count, setCount] = useState(3)
  const [radius, setRadius] = useState(5)
  const [mix, setMix] = useState('random')

  useEffect(()=>{ if (open) { setCount(3); setRadius(5); setMix('random') } }, [open])
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[3200] grid place-items-center bg-black/60">
      <div className="card-glass w-full max-w-md p-6">
        <div className="text-sm text-gray-300">Emergency Control</div>
        <div className="text-white font-semibold text-lg mt-1">Simulate urgent requests</div>
        <div className="mt-4 grid gap-3">
          <div>
            <label className="label">Number of requests: {count}</label>
            <input type="range" min={1} max={10} value={count} onChange={(e)=>setCount(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="label">Radius (km): {radius}</label>
            <input type="range" min={1} max={20} value={radius} onChange={(e)=>setRadius(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="label">Blood mix</label>
            <select className="input-field" value={mix} onChange={(e)=>setMix(e.target.value)}>
              <option value="random">Random</option>
              <option value="same">Same as hospital</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-5">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={onClear}>Clear Simulations</button>
            <button className="btn-primary" onClick={()=>onTrigger({ count, radiusKm: radius, mix })}>Trigger</button>
          </div>
        </div>
      </div>
    </div>
  )
}







