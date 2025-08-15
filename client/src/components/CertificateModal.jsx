import { Download, Printer, X } from "lucide-react";
import { useMemo } from "react";
// html2canvas is dynamically imported in the download handler to avoid SSR/bundle timing issues

export default function CertificateModal({
  open,
  onClose,
  pledge,
  donorName: donorNameProp,
}) {
  const info = useMemo(() => {
    if (!pledge) return null;
    const hospital = pledge.request?.hospital?.name || "Hospital";
    const bloodType = pledge.request?.bloodType || "—";
    const when = pledge.reportAt || pledge.createdAt;
    const dateStr = when ? new Date(when).toLocaleString() : "";
    // Prefer units donated recorded by hospital during verification; if absent or zero,
    // fall back to the units originally assigned on the hospital request
    const assignedUnits =
      typeof pledge.request?.unitsNeeded === "number"
        ? pledge.request.unitsNeeded
        : undefined;
    const computedUnits =
      typeof pledge.unitsDonated === "number" && pledge.unitsDonated > 0
        ? pledge.unitsDonated
        : assignedUnits;
    return {
      donorName:
        donorNameProp || pledge.donor?.name || pledge.donorName || "Donor",
      certificateId: pledge.certificateId,
      hospital,
      bloodType,
      dateStr,
      units: computedUnits,
    };
  }, [pledge, donorNameProp]);

  if (!open || !pledge) return null;

  const handlePrint = () => {
    try {
      const win = window.open("", "_blank", "width=880,height=1240");
      if (!win) return;
      const html =
        document.getElementById("certificate-content")?.outerHTML || "";
      win.document.write(`<!DOCTYPE html><html><head><title>Certificate</title>
        <style>
          body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#0f172a; color:#fff;}
          .wrap{max-width:800px;margin:40px auto;padding:32px;border-radius:16px;background:linear-gradient(135deg, rgba(30,41,59,.9), rgba(15,23,42,.9));box-shadow:0 10px 30px rgba(0,0,0,.5)}
          .title{font-size:28px;font-weight:800;margin:8px 0}
          .sub{font-size:12px;color:#cbd5e1;letter-spacing:.12em;text-transform:uppercase}
          .line{height:1px;background:linear-gradient(90deg, transparent, #22c55e, transparent);margin:16px 0}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .cell{background:rgba(255,255,255,.06);padding:12px;border-radius:10px}
          .label{font-size:11px;color:#cbd5e1}
          .val{font-size:16px;font-weight:700}
        </style>
      </head><body>${html}</body></html>`);
      win.document.close();
      win.focus();
      win.print();
    } catch {}
  };

  const handleDownload = async () => {
    try {
      const { default: html2canvas } = await import("html2canvas");
      const node = document.getElementById("certificate-content");
      if (!node) return;
      const canvas = await html2canvas(node, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `certificate-${info?.certificateId || "donation"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      try {
        handlePrint();
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-[3100] grid place-items-center bg-black/60">
      <div className="card-glass w-full max-w-2xl p-6 relative">
        <button
          className="absolute right-4 top-4 text-white/70 hover:text-white"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Local styles to ensure on-screen rendering matches print and download output */}
        <style>{`
          .wrap{max-width:800px;margin:0 auto;padding:24px;border-radius:16px;background:linear-gradient(135deg, rgba(30,41,59,.9), rgba(15,23,42,.9));box-shadow:0 10px 30px rgba(0,0,0,.5)}
          .title{font-size:28px;font-weight:800;margin:8px 0}
          .sub{font-size:12px;color:#cbd5e1;letter-spacing:.12em;text-transform:uppercase}
          .line{height:1px;background:linear-gradient(90deg, transparent, #22c55e, transparent);margin:16px 0}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .cell{background:rgba(255,255,255,.06);padding:12px;border-radius:10px}
          .label{font-size:11px;color:#cbd5e1}
          .val{font-size:16px;font-weight:700}
        `}</style>
        <div id="certificate-content" className="wrap">
          <div className="sub">Certificate of Appreciation</div>
          <div className="title">Blood Donation Certificate</div>
          <div className="text-sm text-gray-300">
            This certifies that the donor named below has voluntarily donated
            blood to support patient care.
          </div>
          <div className="line" />
          <div className="grid">
            <div className="cell">
              <div className="label">Donor</div>
              <div className="val">{info?.donorName}</div>
            </div>
            <div className="cell">
              <div className="label">Certificate ID</div>
              <div className="val">{info?.certificateId}</div>
            </div>
            <div className="cell">
              <div className="label">Hospital</div>
              <div className="val">{info?.hospital}</div>
            </div>
            <div className="cell">
              <div className="label">Blood Group</div>
              <div className="val">{info?.bloodType}</div>
            </div>
            <div className="cell">
              <div className="label">Units Donated</div>
              <div className="val">{info?.units ?? "—"}</div>
            </div>
            <div className="cell">
              <div className="label">Date</div>
              <div className="val">{info?.dateStr}</div>
            </div>
          </div>
          <div className="line" />
          <div className="text-xs text-gray-300">
            Thank you for your selfless contribution. — Blood Alert
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-secondary" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Download
          </button>
          <button className="btn-primary" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
