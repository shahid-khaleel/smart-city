import React, { useState, useEffect } from "react";
import { CheckCircle, Truck, Wrench, Loader2, Navigation, AlertOctagon, Camera, X, Upload } from "lucide-react";
import { useLocation } from "react-router-dom";
import ComplaintCard from "../components/ComplaintCard";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import EditProfile from '../components/EditProfile';
import LiveClock from "../components/LiveClock";

const WorkerDashboard = () => {
  const { user } = useAuth();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentView = queryParams.get("view") || "tasks";

  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Active");

  const [resolvingTaskId, setResolvingTaskId] = useState(null);
  const [resolutionFile, setResolutionFile] = useState(null);
  const [resolutionPreview, setResolutionPreview] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState("");

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const response = await fetch("/complaints/", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch assignments.");

      const dbData = await response.json();

      const formattedData = dbData.map((dbItem) => ({
        id: dbItem.id,
        title: dbItem.title,
        description: dbItem.description,
        category: dbItem.category || "General",
        location: dbItem.address || "Location pending",
        lat: dbItem.location_lat,
        lng: dbItem.location_lng,
        date: "Recently",
        created_at: dbItem.created_at,
        priority: dbItem.priority || dbItem.severity?.toLowerCase() || "medium",
        status: dbItem.status || "Assigned",
        image_url: dbItem.image_url,
        report_count: dbItem.report_count || 1,
      }));

      setAssignments(formattedData.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("Dashboard connection error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResolutionFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setResolutionPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitResolution = async () => {
    if (!resolvingTaskId) return;

    if (!resolutionNotes.trim()) {
      setResolveError("Please describe how the issue was resolved.");
      return;
    }

    setIsSubmitting(true);
    setResolveError("");

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");

      // 1. Upload the proof photo to Cloudinary first (same flow ComplaintForm
      //    already uses for citizen report photos) so we get a real URL to store.
      let proofImageUrl = null;
      if (resolutionFile) {
        const cloudData = new FormData();
        cloudData.append("file", resolutionFile);
        cloudData.append("upload_preset", "smartcity_connectAI");
        cloudData.append("cloud_name", "njtyl4tg");

        const cloudResponse = await fetch("https://api.cloudinary.com/v1_1/njtyl4tg/image/upload", {
          method: "POST",
          body: cloudData,
        });

        if (!cloudResponse.ok) throw new Error("Photo upload failed.");
        const cloudResult = await cloudResponse.json();
        proofImageUrl = cloudResult.secure_url;
      }

      // 2. Submit the actual resolution (notes + proof photo) to the real endpoint.
      const response = await fetch(`/worker/complaints/${resolvingTaskId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: resolutionNotes.trim(), proof_image_url: proofImageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to submit resolution.");
      }

      setAssignments((prev) =>
        prev.map((task) => (task.id === resolvingTaskId ? { ...task, status: "Resolved" } : task))
      );

      setResolvingTaskId(null);
      setResolutionFile(null);
      setResolutionPreview(null);
      setResolutionNotes("");
    } catch (error) {
      console.error("Error resolving task:", error);
      setResolveError(error.message || "Could not submit resolution. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openInOSM = (lat, lng) => {
    if (lat && lng) {
      window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`, "_blank");
    } else {
      alert("No GPS coordinates available for this task.");
    }
  };

  const filteredAssignments = assignments.filter((task) => {
    const status = task.status.toLowerCase();
    if (activeTab === "Active") {
      return status === "assigned" || status === "in progress" || status === "open";
    }
    return status === "resolved";
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-7">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-gray-200 pb-4 mt-4 md:mt-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white border border-gray-200 rounded-lg text-brand-600">
                <Truck size={20} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Field tasks</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user?.name || "Field worker"}
                  {currentView === 'settings' ? " · Profile settings" : " · Active dispatch"}
                </p>
              </div>
            </div>

            <LiveClock />
          </div>

          {currentView === "settings" ? (
            <EditProfile />
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab("Active")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "Active" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <AlertOctagon size={15} /> Active
                </button>
                <button
                  onClick={() => setActiveTab("Resolved")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "Resolved" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <CheckCircle size={14} /> Resolved
                </button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-16 text-brand-600 gap-3">
                  <Loader2 className="animate-spin" size={28} />
                  <p className="text-sm text-gray-400">Loading assignments…</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredAssignments.length === 0 ? (
                    <div className="p-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
                      <p className="text-gray-400 text-sm">No {activeTab.toLowerCase()} assignments</p>
                    </div>
                  ) : (
                    filteredAssignments.map((task) => (
                      <div key={task.id} className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-1">
                        <ComplaintCard complaint={task} />

                        <div className="mt-2 flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => openInOSM(task.lat, task.lng)}
                            className="flex-1 bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-600 hover:text-brand-700 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                          >
                            <Navigation size={15} /> Navigate
                          </button>

                          {task.status.toLowerCase() !== "resolved" && (
                            <button
                              onClick={() => setResolvingTaskId(task.id)}
                              className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                            >
                              <Camera size={15} /> Upload proof & resolve
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Resolution modal */}
      {resolvingTaskId && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => {
                setResolvingTaskId(null);
                setResolutionFile(null);
                setResolutionPreview(null);
                setResolutionNotes("");
                setResolveError("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full z-10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="text-emerald-600" size={20} /> Confirm resolution
              </h2>
              <p className="text-gray-500 text-sm mt-1.5">
                Describe the fix and attach a photo showing the completed work.
              </p>
            </div>

            <div className="p-6 bg-gray-50 flex flex-col gap-4">
              {resolveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {resolveError}
                </div>
              )}

              <div>
                <label className="label">Resolution notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows="3"
                  className="input resize-none"
                  placeholder="e.g., Replaced the faulty bulb and tested the streetlight — working normally now."
                />
              </div>

              {resolutionPreview ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
                  <img src={resolutionPreview} alt="Resolution" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setResolutionFile(null); setResolutionPreview(null); }}
                    className="absolute bottom-2 right-2 bg-white text-gray-700 p-2 rounded-lg text-xs font-medium shadow-md flex items-center gap-1 hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={13} /> Retake
                  </button>
                </div>
              ) : (
                <label className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-all group">
                  <Camera size={28} className="text-gray-400 group-hover:text-brand-500 mb-2.5 transition-colors" />
                  <span className="text-gray-500 text-sm group-hover:text-brand-600 transition-colors">Tap to open camera</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
                </label>
              )}
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => submitResolution()}
                disabled={!resolutionNotes.trim() || isSubmitting}
                className="btn-primary w-full py-3"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />}
                Confirm & resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
