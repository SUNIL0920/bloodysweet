import { useEffect, useState } from 'react'

export default function FeedbackModal({ open, onClose, onSubmit, pledge }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  useEffect(() => { if (open) { setRating(5); setComment('') } }, [open])
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[3000] grid place-items-center bg-black/50">
      <div className="card-glass w-full max-w-md p-6">
        <div className="text-sm text-gray-300">Thank you for donating</div>
        <div className="text-white font-semibold text-lg mt-1">Share your feedback</div>
        <div className="mt-4">
          <label className="label">Rating (1-5)</label>
          <input type="number" min={1} max={5} className="input-field" value={rating} onChange={(e)=>setRating(Number(e.target.value))} />
        </div>
        <div className="mt-3">
          <label className="label">Comments</label>
          <textarea rows={4} className="input-field" value={comment} onChange={(e)=>setComment(e.target.value)} />
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=>onSubmit({ rating, comment })}>Submit</button>
        </div>
      </div>
    </div>
  )
}


