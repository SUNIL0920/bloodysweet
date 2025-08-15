export default function CodeBadge({ code }) {
  if (!code) return null
  return (
    <div className="fixed top-20 right-4 z-[1500]">
      <div className="bg-amber-500/90 text-black rounded-xl px-4 py-2 shadow-lg border border-amber-200/60">
        <div className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Arrival Code</div>
        <div className="text-lg font-bold">{code}</div>
      </div>
    </div>
  )
}

