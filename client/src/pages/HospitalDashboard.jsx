import { Bolt, CheckCircle2, PlusCircle, Route } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import EmergencyControlModal from "../components/EmergencyControlModal.jsx";
import MapView from "../components/MapView.jsx";
import RequestCard from "../components/RequestCard.jsx";
import Spinner from "../components/Spinner.jsx";
import SwapRequestModal from "../components/SwapRequestModal.jsx";
import VerifyArrivalModal from "../components/VerifyArrivalModal.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { useToast } from "../state/ToastContext.jsx";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function HospitalDashboard() {
  const { user, api, socket } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [bloodType, setBloodType] = useState("O+");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [pledges, setPledges] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [rankedDonors, setRankedDonors] = useState([]);
  const [listings, setListings] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  const [incomingSwaps, setIncomingSwaps] = useState([]);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [showAllFulfilled, setShowAllFulfilled] = useState(false);
  const [outgoingSwaps, setOutgoingSwaps] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const activeRef = useRef(null);
  const fulfilledRef = useRef(null);
  const mapRef = useRef(null);
  const marketRef = useRef(null);
  const scrollTo = (ref) => {
    try {
      ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  };

  const fetchMine = async () => {
    const { data } = await api.get("/api/requests/mine");
    setRequests(data);
  };

  const fetchPledges = async (id) => {
    if (!id) return setPledges([]);
    const { data } = await api.get(`/api/requests/${id}/pledges`);
    setPledges(data);
  };

  const fetchRanking = async (id) => {
    if (!id) return setRanking([]);
    const { data } = await api.get(`/api/requests/${id}/ranking`);
    setRanking(data);
    setRankedDonors(data);
  };

  const fetchFeedbacks = async (id) => {
    if (!id) return setFeedbacks([]);
    try {
      const { data } = await api.get(`/api/requests/${id}/feedbacks`);
      setFeedbacks(data);
    } catch {
      setFeedbacks([]);
    }
  };

  useEffect(() => {
    let timer;
    (async () => {
      setLoading(true);
      try {
        await fetchMine();
        const { data } = await api.get("/api/requests/market/listings");
        setListings(data);
        const near = user?.location?.coordinates?.join(",");
        if (near) {
          const res = await api.get(
            `/api/hospitals/summary?near=${encodeURIComponent(
              near
            )}&radiusKm=50`
          );
          setHospitals(res.data);
        }
        // load incoming swaps
        try {
          const [inc, out] = await Promise.all([
            api.get("/api/requests/market/swaps/incoming"),
            api.get("/api/requests/market/swaps/outgoing"),
          ]);
          setIncomingSwaps(inc.data || []);
          setOutgoingSwaps(out.data || []);
        } catch {}
      } finally {
        setLoading(false);
      }
      timer = setInterval(async () => {
        await fetchMine();
        try {
          const [inc, out] = await Promise.all([
            api.get("/api/requests/market/swaps/incoming"),
            api.get("/api/requests/market/swaps/outgoing"),
          ]);
          setIncomingSwaps(inc.data || []);
          setOutgoingSwaps(out.data || []);
        } catch {}
        if (selected) {
          await fetchPledges(selected);
          await fetchRanking(selected);
          await fetchFeedbacks(selected);
        }
      }, 10000);
    })();

    if (socket) {
      socket.on("pledge:new", (evt) => {
        if (evt.requestId === selected) setPledges((p) => [evt.pledge, ...p]);
      });
      socket.on("pledge:arrived", (evt) => {
        if (evt.requestId === selected)
          setPledges((p) => p.filter((x) => x._id !== evt.pledgeId));
      });
      // Real-time trigger: request created
      socket.on("request:new", async (req) => {
        try {
          await fetchMine();
          const isMine = req?.hospital?._id === user?._id;
          if (isMine) {
            toast.success(
              `Request created • ${req?.bloodType || ""} at ${
                req?.hospital?.name || "Hospital"
              }`
            );
          }
        } catch {}
      });
      socket.on("market:swap:new", (evt) => {
        // refresh both lists; incoming will include only addressed to this hospital
        (async () => {
          try {
            const [inc, out] = await Promise.all([
              api.get("/api/requests/market/swaps/incoming"),
              api.get("/api/requests/market/swaps/outgoing"),
            ]);
            setIncomingSwaps(inc.data || []);
            setOutgoingSwaps(out.data || []);
          } catch {}
        })();
      });
      socket.on("market:swap:update", (_evt) => {
        (async () => {
          try {
            const [inc, out] = await Promise.all([
              api.get("/api/requests/market/swaps/incoming"),
              api.get("/api/requests/market/swaps/outgoing"),
            ]);
            setIncomingSwaps(inc.data || []);
            setOutgoingSwaps(out.data || []);
          } catch {}
        })();
      });
    }

    return () => {
      clearInterval(timer);
      socket?.off("pledge:new");
      socket?.off("pledge:arrived");
      socket?.off("request:new");
      socket?.off("market:swap:new");
      socket?.off("market:swap:update");
    };
  }, [selected, socket, user?._id]);

  const createRequest = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const urgencyLevel = Number(
        document.getElementById("urgencyLevel")?.value || 3
      );
      const unitsNeeded = Number(
        document.getElementById("unitsNeeded")?.value || 1
      );
      const res = await api.post("/api/requests", {
        bloodType,
        urgencyLevel,
        unitsNeeded,
      });
      await fetchMine();
      const emailCount = Number(res?.headers?.["x-notify-email"] || 0);
      const waCount = Number(res?.headers?.["x-notify-whatsapp-sent"] || 0);
      const parts = [
        "Request created",
        emailCount ? `${emailCount} email(s)` : null,
        waCount ? `${waCount} WhatsApp alert(s)` : null,
      ].filter(Boolean);
      toast.success(parts.join(" • "));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create request");
    }
  };

  const fulfill = async (request) => {
    try {
      await api.put(`/api/requests/${request._id}/fulfill`);
      await fetchMine();
    } catch {}
  };

  const verifyArrival = () => {
    if (!selected) return;
    setVerifyOpen(true);
  };

  const handleVerifySubmit = async ({
    code,
    bpSys,
    bpDia,
    hemoglobin,
    sugar,
  }) => {
    if (!selected) return;
    const report = {
      bpSys: typeof bpSys === "number" ? bpSys : undefined,
      bpDia: typeof bpDia === "number" ? bpDia : undefined,
      hemoglobin: typeof hemoglobin === "number" ? hemoglobin : undefined,
      sugar: typeof sugar === "number" ? sugar : undefined,
      reportAt: new Date().toISOString(),
    };
    try {
      const { data } = await api.post(
        `/api/requests/${selected}/verify-arrival`,
        { code, report }
      );
      await fetchMine();
      await fetchPledges(selected);
      toast.success(
        `Arrival verified. Credits added. Certificate ${
          data?.certificateId || ""
        }`
      );
      setVerifyOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to verify");
    }
  };

  const simulateEmergency = async () => {
    try {
      await api.post("/api/requests/simulate", { count: 3 });
      await fetchMine();
      toast.success("Emergency simulated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Simulation failed");
    }
  };

  const buildRoutes = async () => {
    if (!selected) return toast.error("Select a request first");
    const req = requests.find((r) => r._id === selected);
    const hospitalCoordArr = req?.location?.coordinates;
    if (!hospitalCoordArr) return toast.error("Hospital coordinates missing");

    const services = [
      "https://router.project-osrm.org/route/v1/driving/",
      "https://routing.openstreetmap.de/routed-car/route/v1/driving/",
    ];
    const hospitalCoord = hospitalCoordArr.join(",");

    // Prefer ranked donors (already precomputed nearby), otherwise pledges
    const sources = (
      ranking?.length
        ? ranking
        : pledges.map((p) => ({
            location: p.donor?.location,
            name: p.donor?.name,
          }))
    )
      .map((d) => ({
        coords: d.location?.coordinates,
        label: d.name || d?.bloodType || "Donor",
      }))
      .filter((d) => Array.isArray(d.coords));

    if (!sources.length) {
      // Attempt to refresh ranking once if empty
      try { await fetchRanking(selected) } catch {}
      if (!(ranking?.length)) {
        toast.error("No donors found nearby to optimize routes");
        return;
      }
    }

    let best = { duration: Infinity, line: null, label: "" };
    const fetchWithTimeout = (url, ms = 6000) => Promise.race([
      fetch(url),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms)),
    ]);

    for (const s of sources) {
      const from = s.coords.join(",");
      for (const base of services) {
        try {
          const url = `${base}${from};${hospitalCoord}?geometries=geojson&overview=full&steps=false`;
          const res = await fetchWithTimeout(url);
          if (!res || !res.ok) continue;
          const json = await res.json();
          const route = json?.routes?.[0];
          const duration = route?.duration || Infinity;
          const coordsLine =
            route?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];
          if (coordsLine.length && duration < best.duration) {
            best = {
              duration,
              line: { coordinates: coordsLine },
              label: s.label,
            };
          }
          if (best.line) break; // got one, try next source
        } catch {}
      }
      if (!best.line) {
        // graceful fallback: draw straight line if routing service fails
        try {
          const coordsLine = [
            [s.coords[1], s.coords[0]],
            [hospitalCoordArr[1], hospitalCoordArr[0]],
          ];
          best = { duration: best.duration, line: { coordinates: coordsLine }, label: s.label };
        } catch {}
      }
    }

    if (best.line) {
      setRoutes([best.line]);
      const mins = Math.round(best.duration / 60);
      toast.success(`Best route${isFinite(mins) ? ` (${mins} min)` : ''} optimized`);
    } else {
      toast.error("Failed to compute routes");
    }
  };

  if (loading) return <Spinner />;

  const active = requests.filter((r) => r.status === "active");
  const fulfilled = requests.filter((r) => r.status === "fulfilled");
  const visibleFulfilled = showAllFulfilled ? fulfilled : fulfilled.slice(0, 5);
  const center = user?.location?.coordinates;

  return (
    <div className="container-app">
      <div className="grid gap-8">
        {/* Summary */}
        <div className="grid md:grid-cols-4 gap-6">
          <button
            className="card-glass p-4 text-left"
            onClick={() => scrollTo(activeRef)}
          >
            <div className="text-xs text-gray-300">Active Requests</div>
            <div className="text-white font-semibold text-2xl">
              {active.length}
            </div>
          </button>
          <button
            className="card-glass p-4 text-left"
            onClick={() => scrollTo(fulfilledRef)}
          >
            <div className="text-xs text-gray-300">Fulfilled</div>
            <div className="text-white font-semibold text-2xl">
              {fulfilled.length}
            </div>
          </button>
          <button
            className="card-glass p-4 text-left"
            onClick={() => {
              if (!selected && active[0]?._id) {
                setSelected(active[0]._id);
                fetchPledges(active[0]._id);
                fetchRanking(active[0]._id);
              }
              scrollTo(mapRef);
            }}
          >
            <div className="text-xs text-gray-300">Pledged Donors</div>
            <div className="text-white font-semibold text-2xl">
              {pledges.length}
            </div>
          </button>
          <button
            className="card-glass p-4 text-left"
            onClick={() => scrollTo(marketRef)}
          >
            <div className="text-xs text-gray-300">Capacity Units</div>
            <div className="text-white font-semibold text-2xl">
              {user?.capacityUnits || 0}
            </div>
          </button>
        </div>

        <div className="card-glass p-8">
          <div className="text-sm text-gray-300">Hospital</div>
          <h2 className="section-title mt-1">Welcome, {user?.name}</h2>
          <form
            onSubmit={createRequest}
            className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="label">Blood Type</label>
              <select
                className="input-field"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
              >
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Urgency Level</label>
              <input
                type="number"
                min="1"
                max="5"
                defaultValue={3}
                className="input-field"
                id="urgencyLevel"
              />
            </div>
            <div>
              <label className="label">Units Needed</label>
              <input
                type="number"
                min="1"
                max="20"
                defaultValue={1}
                className="input-field"
                id="unitsNeeded"
              />
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <button className="btn-primary">
                <PlusCircle className="h-4 w-4" /> Create
              </button>
              {error && <div className="text-sm text-red-300">{error}</div>}
            </div>
          </form>
        </div>

        <div ref={mapRef} className="card-glass p-8">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold text-white">
              Pledged Donors Map
            </h3>
            <select
              className="input-field"
              value={selected || ""}
              onChange={async (e) => {
                const id = e.target.value || null;
                setSelected(id);
                await fetchPledges(id);
                await fetchRanking(id);
                await fetchFeedbacks(id);
              }}
            >
              <option value="">Select active request…</option>
              {active.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.bloodType} at {r.hospital?.name}
                </option>
              ))}
            </select>
            <button
              className="btn-secondary disabled:opacity-50"
              disabled={!selected}
              onClick={verifyArrival}
            >
              <CheckCircle2 className="h-4 w-4" /> Verify Arrival
            </button>
            <button
              className="btn-secondary"
              onClick={() => setEmergencyOpen(true)}
            >
              <Bolt className="h-4 w-4" /> Trigger Emergency
            </button>
            <button className="btn-secondary" onClick={buildRoutes}>
              <Route className="h-4 w-4" /> Optimize Routes
            </button>
          </div>

          {/* Donation Timing Disclaimer */}
          <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
            <div className="text-xs text-amber-300 font-medium mb-1">
              ⚠️ Important Notice for Donors
            </div>
            <div className="text-xs text-amber-200">
              For health and safety, donors should wait <strong>1 month</strong> after their last donation before donating again. This ensures proper recovery and maintains healthy blood levels.
            </div>
          </div>
          {center && (
            <MapView
              center={center}
              pledges={pledges}
              donors={rankedDonors}
              routes={routes}
              hospitals={hospitals}
              heightClass="h-[480px]"
              onSearchLocate={async (pt) => {
                try {
                  const res = await api.get(
                    `/api/hospitals/summary?near=${encodeURIComponent(
                      pt.join(",")
                    )}&radiusKm=50`
                  );
                  setHospitals(res.data);
                } catch {}
              }}
            />
          )}

          {selected && (
            <div className="mt-4">
              <h4 className="text-white font-semibold mb-2">Recent Feedback</h4>
              <div className="space-y-2">
                {feedbacks.map((f) => (
                  <div key={f._id} className="card-glass p-3 text-sm text-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">
                        {f.donor?.name || "Donor"}
                      </div>
                      <div className="badge">{f.rating}/5</div>
                    </div>
                    {f.comment && (
                      <div className="text-xs text-gray-300 mt-1">{f.comment}</div>
                    )}
                    {f.at && (
                      <div className="text-[11px] text-gray-400 mt-1">
                        {new Date(f.at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
                {feedbacks.length === 0 && (
                  <div className="text-xs text-gray-300">No feedback yet.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div ref={activeRef} className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Active Requests
            </h3>
            <div className="space-y-3">
              {active.map((r) => (
                <RequestCard key={r._id} request={r} onFulfill={fulfill} />
              ))}
              {active.length === 0 && (
                <div className="text-sm text-gray-300">No active requests</div>
              )}
            </div>
          </div>
          <div ref={fulfilledRef} className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Fulfilled</h3>
            <div className="space-y-3">
              {visibleFulfilled.map((r) => (
                <RequestCard key={r._id} request={r} />
              ))}
              {fulfilled.length === 0 && (
                <div className="text-sm text-gray-300">
                  No fulfilled requests yet
                </div>
              )}
              {fulfilled.length > 5 && (
                <button
                  className="btn-ghost text-sm underline"
                  onClick={() => setShowAllFulfilled((s) => !s)}
                >
                  {showAllFulfilled
                    ? "Show less"
                    : `Show all (${fulfilled.length})`}
                </button>
              )}
            </div>
          </div>
        </div>

        <div ref={marketRef} className="card-glass p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">
              Consortium: Unit Swap Marketplace
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {listings
              .filter((h) => h._id !== user?._id)
              .map((h) => (
                <div
                  key={h._id}
                  className="card-glass p-3 flex items-center justify-between text-sm text-gray-200"
                >
                  <div>
                    <div className="text-white font-medium">{h.name}</div>
                    <div className="text-xs text-gray-300">
                      Capacity Units: {h.capacityUnits || 0}
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSwapTarget(h);
                      setSwapOpen(true);
                    }}
                  >
                    Request Swap
                  </button>
                </div>
              ))}
            {listings.filter((h) => h._id !== user?._id).length === 0 && (
              <div className="text-xs text-gray-300">No hospitals listed.</div>
            )}
          </div>
          <div className="divider" />
          <h4 className="text-white font-semibold mb-2">Incoming Requests</h4>
          <div className="space-y-2">
            {incomingSwaps.map((s) => (
              <div
                key={s._id}
                className="card-glass p-3 flex items-center justify-between text-sm text-gray-200"
              >
                <div>
                  <div className="text-white font-medium">
                    {s.fromHospital?.name || "Hospital"}
                  </div>
                  <div className="text-xs text-gray-300">
                    {s.bloodType} • {s.units} unit(s) • {s.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={s.status !== "pending"}
                    className="btn-primary disabled:opacity-50"
                    onClick={async () => {
                      try {
                        await api.post(
                          `/api/requests/market/swaps/${s._id}/accept`
                        );
                        const sres = await api.get(
                          "/api/requests/market/swaps/incoming"
                        );
                        setIncomingSwaps(sres.data || []);
                        toast.success("Swap accepted");
                      } catch (e) {
                        toast.error(e?.response?.data?.message || "Failed");
                      }
                    }}
                  >
                    Accept
                  </button>
                  <button
                    disabled={s.status !== "pending"}
                    className="btn-secondary disabled:opacity-50"
                    onClick={async () => {
                      try {
                        await api.post(
                          `/api/requests/market/swaps/${s._id}/decline`
                        );
                        const sres = await api.get(
                          "/api/requests/market/swaps/incoming"
                        );
                        setIncomingSwaps(sres.data || []);
                        toast.success("Swap declined");
                      } catch (e) {
                        toast.error(e?.response?.data?.message || "Failed");
                      }
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {incomingSwaps.length === 0 && (
              <div className="text-xs text-gray-300">No incoming requests.</div>
            )}
          </div>
          <div className="divider" />
          <h4 className="text-white font-semibold mb-2">My Swap Requests</h4>
          <div className="space-y-2">
            {outgoingSwaps.map((s) => (
              <div
                key={`out-${s._id}`}
                className="card-glass p-3 flex items-center justify-between text-sm text-gray-200"
              >
                <div>
                  <div className="text-white font-medium">
                    To: {s.toHospital?.name || "Hospital"}
                  </div>
                  <div className="text-xs text-gray-300">
                    {s.bloodType} • {s.units} unit(s) • {s.status}
                  </div>
                </div>
              </div>
            ))}
            {outgoingSwaps.length === 0 && (
              <div className="text-xs text-gray-300">No outgoing requests.</div>
            )}
          </div>
        </div>

        {selected && (
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Smart Dispatch Ranking
            </h3>
            <div className="grid gap-2">
              {ranking.map((d) => (
                <div
                  key={d.donorId}
                  className="flex items-center justify-between text-sm text-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center text-white">
                      {d.bloodType.replace("+", "＋")}
                    </div>
                    <div>
                      <div className="text-white font-medium">{d.name}</div>
                      <div className="text-xs text-gray-300">
                        ~{d.distanceKm.toFixed(1)} km • resp{" "}
                        {Math.round((d.responsiveness || 0) * 100)}%
                      </div>
                    </div>
                  </div>
                  <div className="w-40 h-2 bg-white/10 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-green-600"
                      style={{ width: `${d.urgencyScore}%` }}
                    />
                  </div>
                </div>
              ))}
              {ranking.length === 0 && (
                <div className="text-xs text-gray-300">
                  No ranked donors yet.
                </div>
              )}
            </div>
          </div>
        )}
        <SwapRequestModal
          open={swapOpen}
          hospital={swapTarget}
          onClose={() => setSwapOpen(false)}
          onSubmit={async ({ bloodType, units }) => {
            if (!swapTarget) return;
            try {
              await api.post("/api/requests/market/swap", {
                toHospitalId: swapTarget._id,
                bloodType,
                units,
              });
              setSwapOpen(false);
              toast.success(
                `Swap request sent to ${swapTarget.name} • ${bloodType} • ${units} unit(s)`
              );
            } catch (e) {
              toast.error(e?.response?.data?.message || "Failed to send swap");
            }
          }}
        />
        <EmergencyControlModal
          open={emergencyOpen}
          onClose={() => setEmergencyOpen(false)}
          onClear={async () => {
            try {
              await api.post("/api/requests/simulate/clear");
              await fetchMine();
              toast.success("Simulations cleared");
            } catch (e) {
              toast.error(e?.response?.data?.message || "Failed to clear");
            }
          }}
          onTrigger={async ({ count, radiusKm, mix }) => {
            try {
              await api.post("/api/requests/simulate", {
                count,
                radiusKm,
                mix,
              });
              await fetchMine();
              toast.success(`Emergency: created ${count}`);
              setEmergencyOpen(false);
            } catch (e) {
              toast.error(e?.response?.data?.message || "Failed to simulate");
            }
          }}
        />
        <VerifyArrivalModal
          open={verifyOpen}
          onClose={() => setVerifyOpen(false)}
          onSubmit={handleVerifySubmit}
        />
      </div>
    </div>
  );
}
