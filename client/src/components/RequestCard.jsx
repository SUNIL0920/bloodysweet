export default function RequestCard({ request, onFulfill }) {
  const distanceKm = request.distanceMeters ? (request.distanceMeters / 1000).toFixed(1) : null

  return (
    <div className="card-glass p-4 flex items-start justify-between">
      <div>
        <div className="text-xs text-gray-300">Hospital</div>
        <div className="text-white font-semibold">{request.hospital?.name || 'Unknown Hospital'}</div>
        <div className="mt-1 text-sm text-gray-200">Blood Type: <span className="font-semibold text-white">{request.bloodType}</span></div>
        {distanceKm && (
          <div className="text-xs text-gray-300 mt-1">Distance: {distanceKm} km</div>
        )}
        <div className="mt-1 text-xs text-gray-300">Status: <span className="uppercase text-gray-200">{request.status}</span></div>
      </div>
      {onFulfill && request.status === 'active' && (
        <button onClick={() => onFulfill(request)} className="btn-primary">Mark Fulfilled</button>
      )}
    </div>
  )
} 