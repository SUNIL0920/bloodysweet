import { useEffect, useState } from 'react'
import { Clock, Timer } from 'lucide-react'

export default function PledgeModal({ open, onClose, onSubmit, request }) {
  const [eta, setEta] = useState(20)
  const [available, setAvailable] = useState(60)

  useEffect(() => {
    if (open) {
      setEta(20)
      setAvailable(60)
    }
  }, [open])

  if (!open) return null

  const hospitalName = request?.hospital?.name || 'Hospital'
  const bt = request?.bloodType

  return (
    <div className="fixed inset-0 z-[3000] grid place-items-center bg-black/50">
      <div className="card-glass w-full max-w-md p-6">
        <div className="text-sm text-gray-300">Pledge to Donate</div>
        <div className="text-white font-semibold text-lg mt-1">{bt} at {hospitalName}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">Your ETA (minutes)</label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
              <input type="number" min={0} max={300} className="input-field pl-9" value={eta} onChange={(e)=>setEta(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="label">Available at hospital (minutes)</label>
            <div className="relative">
              <Timer className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
              <input type="number" min={0} max={480} className="input-field pl-9" value={available} onChange={(e)=>setAvailable(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=>onSubmit({ etaMinutes: Number(eta)||0, availableForMinutes: Number(available)||0 })}>Confirm Pledge</button>
        </div>
      </div>
    </div>
  )
}


