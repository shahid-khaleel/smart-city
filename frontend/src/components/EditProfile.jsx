import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldAlert,
  Check,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  Loader2,
  Send,
  Unlock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentRole = user?.role?.toLowerCase() || "";
  const isRestrictedRole =
    currentRole === "worker" ||
    currentRole === "dept" ||
    currentRole === "official";
  const basePath = currentRole === "admin" ? "/admin" : "/dashboard";

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    password: "",
  });

  const [isFetching, setIsFetching] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [requestStatus, setRequestStatus] = useState("None");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const isFormLocked = isRestrictedRole && requestStatus !== "Approved";

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const dbUser = await response.json();
          setFormData({
            fullName: dbUser.full_name || dbUser.name || "",
            email: dbUser.email || "",
            phone: dbUser.phone_number || dbUser.phone || dbUser.phone_no || dbUser.mobile || "",
            city: dbUser.city || "",
            state: dbUser.state || "",
            password: "",
          });
        }

        if (isRestrictedRole) {
          const statusRes = await fetch("/api/auth/edit-request/status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setRequestStatus(statusData.status);
          }
        }
      } catch (error) {
        console.error("Failed to sync with database:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfileData();
  }, [isRestrictedRole]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isFormLocked) return;

    setIsSaving(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          phone: formData.phone,
          city: formData.city,
          state: formData.state,
          password: formData.password ? formData.password : undefined,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setRequestStatus("None");
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.detail || "Failed to update profile.");
      }
    } catch (err) {
      setErrorMsg("Network error while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!requestReason.trim()) return;
    setIsSubmittingRequest(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/request-edit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: requestReason }),
      });

      if (response.ok) {
        setRequestStatus("Pending");
        setShowRequestForm(false);
        setRequestReason("");
      } else {
        setErrorMsg("Failed to send the request to your admin.");
      }
    } catch (error) {
      setErrorMsg("Network error while sending the request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="animate-spin text-brand-600" size={32} />
        <p className="text-sm text-gray-400">Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Profile settings</h2>
        <p className="text-xs text-gray-500 mt-0.5">Manage your account details</p>
      </div>

      <div className="card p-5 md:p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center mb-2.5">
            <span className="text-xl font-semibold text-brand-600">
              {formData.fullName.charAt(0) || "U"}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{formData.fullName || "User"}</h3>
          <span className="badge badge-gray mt-1.5 capitalize">{user?.role || "Citizen"}</span>
        </div>

        {/* Restricted-role banner */}
        {isRestrictedRole && (
          <div className="mb-6 flex flex-col gap-2.5">
            {requestStatus === "Approved" ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                <Unlock className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-medium text-emerald-800 mb-1">Editing unlocked</h4>
                  <p className="text-sm text-emerald-700/80 leading-relaxed">
                    An admin has temporarily unlocked your profile. This access is revoked automatically after you save.
                  </p>
                </div>
              </div>
            ) : requestStatus === "Pending" ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-medium text-amber-800 mb-1">Editing restricted</h4>
                  <p className="text-sm text-amber-700/80 leading-relaxed mb-3">
                    Profile edits need admin approval for your role.
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 text-xs font-medium rounded-md border border-emerald-200">
                    <Check size={12} /> Request sent — awaiting approval
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-800 mb-1">Editing restricted</h4>
                  <p className="text-sm text-amber-700/80 leading-relaxed">
                    Profile edits need admin approval for your role.
                  </p>

                  {requestStatus === "Denied" && (
                    <p className="text-sm text-red-600 mt-2 mb-1 font-medium">
                      Your previous request was denied.
                    </p>
                  )}

                  {!showRequestForm && (
                    <button
                      onClick={() => setShowRequestForm(true)}
                      className="mt-3 px-3.5 py-2 bg-white hover:bg-amber-100/50 text-amber-700 text-xs font-medium rounded-md border border-amber-300 transition-colors flex items-center gap-1.5"
                    >
                      <Send size={12} /> {requestStatus === "Denied" ? "Request again" : "Request edit access"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {showRequestForm && (
              <form onSubmit={handleSendRequest} className="p-4 bg-gray-50 border border-gray-200 rounded-lg animate-in fade-in slide-in-from-top-1">
                <label className="label">Reason for the request</label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="E.g., I have a new contact number…"
                  className="input h-24 resize-none mb-3"
                  required
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowRequestForm(false)} className="btn-secondary px-4 py-2 text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingRequest || !requestReason.trim()} className="btn-primary px-4 py-2 text-xs">
                    {isSubmittingRequest ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    Send request
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <User size={13} /> Full name
              </label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} disabled={isFormLocked} className="input" />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Mail size={13} /> Email (locked)
              </label>
              <input type="email" name="email" value={formData.email} disabled className="input" />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Phone size={13} /> Phone number
              </label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} disabled={isFormLocked} className="input" />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <MapPin size={13} /> Location
              </label>
              <div className="flex gap-2">
                <input type="text" name="city" value={formData.city} onChange={handleChange} disabled={isFormLocked} placeholder="City" className="input w-1/2" />
                <input type="text" name="state" value={formData.state} onChange={handleChange} disabled={isFormLocked} placeholder="State" className="input w-1/2" />
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-gray-100">
              <label className="label">New password</label>
              <p className="text-xs text-gray-400 mb-2">Leave blank to keep your current password.</p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isFormLocked}
                  className="input pr-10"
                  placeholder="Enter new password…"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isFormLocked}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={() => navigate(basePath)} className="btn-secondary flex-1">
              <ArrowLeft size={14} /> Back
            </button>

            <button
              type="submit"
              disabled={isFormLocked || isSaving || saveSuccess}
              className={`flex-1 ${saveSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-2.5 flex items-center justify-center gap-2 text-sm font-medium' : 'btn-primary'}`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                <>
                  <Save size={16} /> Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
