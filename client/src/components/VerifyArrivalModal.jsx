import { useEffect, useState } from 'react'

export default function VerifyArrivalModal({ open, onClose, onSubmit }) {
  const [code, setCode] = useState('')
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [hemoglobin, setHemoglobin] = useState('')
  const [sugar, setSugar] = useState('')
  const [units, setUnits] = useState('')

  useEffect(() => {
    if (open) {
      setCode('')
      setBpSys('')
      setBpDia('')
      setHemoglobin('')
      setSugar('')
      setUnits('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = () => {
    if (!code.trim()) return
    onSubmit({
      code: code.trim(),
      bpSys: bpSys !== '' ? Number(bpSys) : undefined,
      bpDia: bpDia !== '' ? Number(bpDia) : undefined,
      hemoglobin: hemoglobin !== '' ? Number(hemoglobin) : undefined,
      sugar: sugar !== '' ? Number(sugar) : undefined,
      unitsDonated: units !== '' ? Number(units) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[3000] grid place-items-center bg-black/50">
      <div className="card-glass w-full max-w-md p-6">
        <div className="text-sm text-gray-300">Verify Donor Arrival</div>
        <div className="text-white font-semibold text-lg mt-1">Enter donor code and wellness</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="md:col-span-2">
            <label className="label">Donor Code</label>
            <input type="text" className="input-field" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
          </div>
          <div>
            <label className="label">BP SYS</label>
            <input type="number" className="input-field" value={bpSys} onChange={(e)=>setBpSys(e.target.value)} placeholder="e.g., 120" />
          </div>
          <div>
            <label className="label">BP DIA</label>
            <input type="number" className="input-field" value={bpDia} onChange={(e)=>setBpDia(e.target.value)} placeholder="e.g., 80" />
          </div>
          <div>
            <label className="label">Hemoglobin (g/dL)</label>
            <input type="number" className="input-field" value={hemoglobin} onChange={(e)=>setHemoglobin(e.target.value)} placeholder="e.g., 13.5" step="0.1" />
          </div>
          <div>
            <label className="label">Sugar (mg/dL)</label>
            <input type="number" className="input-field" value={sugar} onChange={(e)=>setSugar(e.target.value)} placeholder="e.g., 100" />
          </div>
          <div>
            <label className="label">Units Donated</label>
            <input type="number" min="0" max="20" className="input-field" value={units} onChange={(e)=>setUnits(e.target.value)} placeholder="e.g., 1" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!code.trim()}>Verify</button>
        </div>
      </div>
    </div>
  )
}


