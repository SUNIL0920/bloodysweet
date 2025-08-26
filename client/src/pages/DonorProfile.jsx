import {
  AtSign,
  Award,
  Calendar,
  Droplets,
  Edit,
  FileText,
  Gift,
  Heart,
  Phone,
  Save,
  ShieldCheck,
  User2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import CertificateModal from "../components/CertificateModal.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { useToast } from "../state/ToastContext.jsx";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function DonorProfile() {
  const { user, api, refreshUser, setUser } = useAuth();
  const toast = useToast();
  const [pledges, setPledges] = useState([]);
  const [certFor, setCertFor] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    phone: "",
    bloodType: "",
    whatsappOptIn: false,
    medicalConditions: "",
  });
  const [saving, setSaving] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!isEditing) return;
    const prev = document?.body?.style?.overflow;
    try { document.body.style.overflow = 'hidden'; } catch {}
    return () => { try { document.body.style.overflow = prev || ''; } catch {} };
  }, [isEditing]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/requests/pledges/mine");
        setPledges(data);
      } catch {}
      try {
        const { data } = await api.get("/api/requests/certificates/mine");
        setCertificates(data || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || "",
        email: user.email || "",
        age: user.age || "",
        gender: user.gender || "",
        phone: user.phone || "",
        bloodType: user.bloodType || "O+",
        whatsappOptIn: user.whatsappOptIn || false,
        medicalConditions: user.medicalConditions || "",
      });
    }
  }, [user]);

  const latestPledge = pledges.find(
    (p) => p.status === "pledged" || p.status === "arrived"
  );
  const code =
    latestPledge?.code ||
    (typeof window !== "undefined"
      ? localStorage.getItem(`activeArrivalCode:${user?._id || ""}`)
      : "");

  const handleRedeem = async () => {
    if ((user?.creditPoints || 0) < 100) return;
    setRedeeming(true);
    try {
      const { data } = await api.post("/api/requests/health-check/redeem");
      if (data?.user) setUser(data.user);
      else await refreshUser();
      toast.success("Redeemed 100 credits for a free health check!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to redeem");
    } finally {
      setRedeeming(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/api/auth/profile", editForm);
      setUser(data.user);
      try { await refreshUser(); } catch {}
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      age: user.age || "",
      gender: user.gender || "",
      phone: user.phone || "",
      bloodType: user.bloodType || "O+",
      whatsappOptIn: user.whatsappOptIn || false,
      medicalConditions: user.medicalConditions || "",
    });
    setIsEditing(false);
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="container-app">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-300">Donor Profile</div>
              <h2 className="section-title mt-1">{user?.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="badge">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </div>
              <button
                type="button"
                onClick={handleEdit}
                className="btn-secondary"
                title="Edit Profile"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Profile Details */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Personal Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User2 className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-300">Full Name</span>
                </div>
                <div className="text-white font-medium">
                  {user?.name || "—"}
                </div>
              </div>

              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AtSign className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-300">Email Address</span>
                </div>
                <div className="text-white font-medium">
                  {user?.email || "—"}
                </div>
              </div>

              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-300">Phone Number</span>
                </div>
                <div className="text-white font-medium">
                  {user?.phone || "—"}
                </div>
              </div>

              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-300">Age</span>
                </div>
                <div className="text-white font-medium">
                  {user?.age || "—"} years
                </div>
              </div>

              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-4 w-4 text-gray-400">🧑</span>
                  <span className="text-xs text-gray-300">Gender</span>
                </div>
                <div className="text-white font-medium">
                  {user?.gender || "—"}
                </div>
              </div>

              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-300">Blood Type</span>
                </div>
                <div className="text-white font-medium flex items-center gap-2">
                  <Droplets className="h-4 w-4" /> {user?.bloodType || "—"}
                </div>
              </div>

              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-300">WhatsApp Alerts</span>
                </div>
                <div className="text-white font-medium">
                  {user?.whatsappOptIn ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-3 mt-6">
            <div className="card-glass p-3">
              <div className="text-xs text-gray-300">Age</div>
              <div className="text-white font-semibold text-lg">
                {user?.age ?? "—"}
              </div>
            </div>
            <div className="card-glass p-3">
              <div className="text-xs text-gray-300">Blood Group</div>
              <div className="text-white font-semibold text-lg flex items-center gap-2">
                <Droplets className="h-4 w-4" /> {user?.bloodType}
              </div>
            </div>
            <div className="card-glass p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-300">Blood Credits</div>
                  <div className="text-white font-semibold text-lg flex items-center gap-2">
                    <Award className="h-4 w-4" /> {user?.creditPoints || 0}
                  </div>
                </div>
                <button
                  className="btn-primary disabled:opacity-50 whitespace-nowrap"
                  disabled={(user?.creditPoints || 0) < 100 || redeeming}
                  onClick={handleRedeem}
                  title={
                    (user?.creditPoints || 0) >= 100
                      ? "Redeem 100 credits"
                      : "Need 100+ credits"
                  }
                >
                  <Gift className="h-4 w-4" /> Redeem 100
                </button>
              </div>
              <div className="text-[11px] text-gray-400 mt-2">
                Redeem for a free health checkup when you have 100+ credits.
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Recent Activity & Wellness
            </h3>
            <div className="space-y-2">
              {pledges.slice(0, 5).map((p) => (
                <div key={p._id} className="card-glass p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">
                        {p.request?.hospital?.name}
                      </div>
                      <div className="text-xs text-gray-300">
                        {p.request?.bloodType} •{" "}
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.code && <div className="badge">code: {p.code}</div>}
                      {p.certificateId && (
                        <button
                          className="btn-secondary"
                          onClick={() => setCertFor(p)}
                          title="View certificate"
                        >
                          <FileText className="h-4 w-4" /> View
                        </button>
                      )}
                      <div className="badge">{p.status}</div>
                    </div>
                  </div>
                  {(p.status === "arrived" ||
                    p.request?.status === "fulfilled") && (
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-200">
                      {p.bpSys && p.bpDia && (
                        <div className="card-glass p-2">
                          BP:{" "}
                          <span className="font-semibold">
                            {p.bpSys}/{p.bpDia}
                          </span>
                        </div>
                      )}
                      {p.hemoglobin != null && (
                        <div className="card-glass p-2">
                          Hemoglobin:{" "}
                          <span className="font-semibold">
                            {p.hemoglobin} g/dL
                          </span>
                        </div>
                      )}
                      {p.sugar != null && (
                        <div className="card-glass p-2">
                          Sugar:{" "}
                          <span className="font-semibold">{p.sugar} mg/dL</span>
                        </div>
                      )}
                      {p.certificateId && (
                        <div className="card-glass p-2">
                          Certificate:{" "}
                          <span className="font-semibold">
                            {p.certificateId}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {pledges.length === 0 && (
                <div className="text-xs text-gray-300">No pledges yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="card-glass p-6">
          <div className="text-sm text-gray-300">Arrival Code</div>
          <div className="mt-2 grid place-items-center">
            {code ? (
              <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 w-full text-center">
                <div className="text-xs uppercase tracking-widest text-slate-600">
                  Show at hospital
                </div>
                <div className="text-3xl font-extrabold mt-1">{code}</div>
              </div>
            ) : (
              <div className="text-xs text-gray-300">No active code</div>
            )}
          </div>
          <div className="mt-4 text-xs text-gray-300">
            This code stays visible until your donation is verified by the
            hospital.
          </div>

          {/* Donation Timing Disclaimer */}
          <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
            <div className="text-xs text-amber-300 font-medium mb-1">
              ⚠️ Important Notice
            </div>
            <div className="text-xs text-amber-200">
              For your health and safety, please wait <strong>1 month</strong> after your last donation before donating again. This ensures your body has sufficient time to recover and maintain healthy blood levels.
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm text-gray-300 mb-2">My Certificates</div>
            <div className="space-y-2">
              {pledges
                .filter((p) => p.certificateId)
                .map((p) => (
                  <div
                    key={`cert-${p._id}`}
                    className="card-glass p-3 flex items-center justify-between text-sm text-gray-200"
                  >
                    <div>
                      <div className="text-white font-medium">
                        {p.certificateId}
                      </div>
                      <div className="text-xs text-gray-400">
                        {p.request?.hospital?.name} •{" "}
                        {new Date(p.reportAt || p.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="btn-secondary"
                      onClick={() => setCertFor(p)}
                    >
                      <FileText className="h-4 w-4" /> View
                    </button>
                  </div>
                ))}
              {pledges.filter((p) => p.certificateId).length === 0 && (
                <div className="text-xs text-gray-400">
                  Certificates will appear here after successful donation
                  verification.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-glass p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Profile</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn-primary px-3 py-1 text-sm"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-white"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    className="input-field pl-10"
                    value={editForm.name}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    className="input-field pl-10"
                    value={editForm.email}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Gender</label>
                  <select name="gender" className="input-field" value={editForm.gender} onChange={onChange}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Age</label>
                  <input type="number" name="age" className="input-field" value={editForm.age} onChange={onChange} min="16" max="100" />
                </div>
              </div>

              <div>
                <label className="label">Medical Conditions (optional)</label>
                <textarea name="medicalConditions" className="input-field" rows="3" value={editForm.medicalConditions} onChange={onChange} placeholder="E.g., diabetes, hypertension, etc." />
              </div>

              <div>
                <label className="label">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    className="input-field pl-10"
                    value={editForm.phone}
                    onChange={onChange}
                    placeholder="+91XXXXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="label">Age</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min="16"
                    max="100"
                    name="age"
                    className="input-field pl-10"
                    value={editForm.age}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div>
                <label className="label">Blood Type</label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <select
                    name="bloodType"
                    className="input-field pl-10"
                    value={editForm.bloodType}
                    onChange={onChange}
                  >
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="whatsappOptIn"
                    checked={editForm.whatsappOptIn}
                    onChange={onChange}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium text-white">
                      Receive WhatsApp alerts
                    </span>
                    <p className="text-sm text-gray-300 mt-1">
                      Get notified about nearby blood requests via WhatsApp
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 justify-center"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CertificateModal
        open={!!certFor}
        pledge={certFor}
        donorName={user?.name}
        onClose={() => setCertFor(null)}
      />
    </div>
  );
}
