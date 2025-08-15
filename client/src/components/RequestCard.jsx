export default function RequestCard({ request, onFulfill }) {
  const distanceKm = typeof request.distanceKm === 'number'
    ? request.distanceKm.toFixed(1)
    : request.distanceMeters ? (request.distanceMeters / 1000).toFixed(1) : null

  const urgency = request.urgencyLevel || 3
  const score = typeof request.urgencyScore === 'number' ? request.urgencyScore : urgency * 20
  const barWidth = Math.max(10, Math.min(100, score))

  return (
    <div className="card-glass p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="text-xs text-gray-400">Hospital</div>
          <div className="text-white font-semibold text-lg leading-tight">{request.hospital?.name || 'Unknown Hospital'}</div>
          <div className="text-sm text-gray-200">Blood Type: <span className="font-semibold text-white">{request.bloodType}</span></div>
          {request.createdAt && (
            <div className="text-xs text-gray-400 mt-1">Created: {new Date(request.createdAt).toLocaleString()}</div>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-200">
            {distanceKm && <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">~{distanceKm} km</div>}
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase">{request.status}</div>
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">Urgency: <span className="font-semibold">{urgency}/5</span></div>
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">Units: <span className="font-semibold">{request.unitsNeeded || 1}</span></div>
            {typeof request.compatibilityScore === 'number' && (
              <div className={`px-3 py-1 rounded-full border ${request.compatibilityScore? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200':'bg-red-500/10 border-red-500/40 text-red-200'}`}>
                Compat: <span className="font-semibold">{request.compatibilityScore ? 'Yes' : 'No'}</span>
              </div>
            )}
          </div>
        </div>
        {onFulfill && request.status === 'active' && (
          <button onClick={() => onFulfill(request)} className="btn-primary text-sm px-5 py-2">Mark Fulfilled</button>
        )}
      </div>
      <div className="mt-4">
        <div className="text-xs text-gray-400 mb-1">Urgency Score</div>
        <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500" style={{ width: `${barWidth}%` }} />
        </div>
      </div>
    </div>
  )
}