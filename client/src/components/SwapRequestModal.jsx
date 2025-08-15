import { useEffect, useState } from 'react'

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function SwapRequestModal({ open, onClose, onSubmit, hospital }) {
  const [bloodType, setBloodType] = useState('O+')
  const [units, setUnits] = useState(1)

  useEffect(() => {
    if (open) {
      setBloodType('O+')
      setUnits(1)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[3000] grid place-items-center bg-black/50">
      <div className="card-glass w-full max-w-md p-6">
        <div className="text-sm text-gray-300">Request Unit Swap</div>
        <div className="text-white font-semibold text-lg mt-1">{hospital?.name || 'Hospital'}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">Blood Type</label>
            <select className="input-field" value={bloodType} onChange={(e)=>setBloodType(e.target.value)}>
              {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Units Needed</label>
            <input type="number" min={1} max={20} className="input-field" value={units} onChange={(e)=>setUnits(Number(e.target.value)||1)} />
          </div>
        </div>
        <div className="text-xs text-gray-300 mt-3">You are requesting units from the selected hospital. This will notify the other hospital on the marketplace.</div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=>onSubmit({ bloodType, units })}>Send Request</button>
        </div>
      </div>
    </div>
  )
}



