import React, { useState, useEffect } from "react";
import { Activity, AlertOctagon, CheckCircle, Clock, MapPin, Navigation, Bell, Check, X, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import ComplaintCard from "../components/ComplaintCard";
import Sidebar from "../components/Sidebar";
import EditProfile from "../components/EditProfile";
import LiveClock from "../components/LiveClock";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocateControl = () => {
  const map = useMap();

  const handleLocate = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 14, { duration: 1.5 });
        },
        () => alert("Could not get your location.")
      );
    }
  };

  return (
    <button
      onClick={(e) => { e.preventDefault(); handleLocate(); }}
      className="absolute bottom-6 right-4 z-[400] bg-white border border-gray-200 p-3 rounded-full shadow-md text-brand-600 hover:bg-gray-50 transition-all"
      title="Go to current location"
    >
      <Navigation size={18} />
    </button>
  );
};

const AdminDashboard = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentView = queryParams.get("view") || "overview";
  const requestFilter = queryParams.get("filter") || "all";

  const [complaints, setComplaints] = useState([]);
  const [editRequests, setEditRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showNotifications, setShowNotifications] = useState(false);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");

        const compRes = await fetch("/complaints/", {
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (compRes.ok) {
          const dbData = await compRes.json();

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
            status: dbItem.status || "Pending review",
            image_url: dbItem.image_url,
            report_count: dbItem.report_count || 1,
          }));

          setComplaints(formattedData.sort((a, b) => b.id - a.id));
        }

        const reqRes = await fetch("/api/auth/edit-requests", {
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setEditRequests((prev) => {
            if (reqData.length > prev.length) setHasViewedNotifications(false);
            return reqData;
          });
        }
      } catch (error) {
        console.error("Network error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const handleRequestAction = async (reqId, action) => {
    setProcessingId(reqId);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const response = await fetch(`/api/auth/edit-requests/${reqId}?action=${action}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        setEditRequests(prev => prev.filter(r => r.id !== reqId));
      }
    } catch (error) {
      console.error("Failed to process request:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setHasViewedNotifications(true);
  };

  const stats = [
    { label: "Active reports", value: complaints.length.toString(), icon: Activity, color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Critical priority", value: complaints.filter(c => (c.priority || "").toLowerCase() === "high" || (c.severity || "").toLowerCase() === "high").length.toString(), icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50" },
    { label: "Pending review", value: complaints.filter(c => ["pending", "open", "submitted"].includes((c.status || "").toLowerCase())).length.toString(), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Resolved", value: complaints.filter(c => (c.status || "").toLowerCase() === "resolved").length.toString(), icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const mockFleet = [
    { id: 1, name: "Field Unit 1", lat: 12.9716, lng: 77.5946, status: "Active — heavy repair" },
    { id: 2, name: "Field Unit 2", lat: 12.965, lng: 77.605, status: "Idle — inspection" },
  ];

  const filteredRequests = editRequests.filter(req => {
    if (requestFilter === "dept") return req.role === "dept" || req.role === "official";
    if (requestFilter === "worker") return req.role === "worker";
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-5 md:p-7">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Admin dashboard</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentView === 'fleet' ? 'Live fleet map' : currentView === 'settings' ? 'Manage your profile' : currentView === 'requests' ? 'Profile edit requests' : 'Overview of city-wide reports'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <LiveClock />

              <div className="relative z-50">
                <button onClick={toggleNotifications} className="relative p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
                  <Bell size={16} />
                  {editRequests.length > 0 && !hasViewedNotifications && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-white"></span>
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-top-1">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-2 mb-3">Pending requests</h3>
                    {editRequests.length === 0 ? (
                      <p className="text-sm text-gray-500">No pending requests.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        {editRequests.map(req => (
                          <div key={req.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs font-medium text-amber-600">{req.user_name} ({req.role})</p>
                            <p className="text-xs text-gray-600 mt-1 truncate">"{req.reason}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Live
              </div>
            </div>
          </div>

          {currentView === "settings" ? (
            <EditProfile />
          ) : currentView === "requests" ? (
            <div className="card p-5 md:p-6 min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-4">
                {requestFilter === "dept" ? "Department " : requestFilter === "worker" ? "Field unit " : "All "}edit requests
              </h2>

              <div className="space-y-2.5">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-gray-400 text-sm">No pending requests</p>
                  </div>
                ) : (
                  filteredRequests.map((req) => (
                    <div key={req.id} className="flex flex-col md:flex-row gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{req.user_name}</h3>
                        <span className="badge badge-amber mt-1 mb-2 capitalize">{req.role}</span>
                        <p className="text-sm text-gray-600 bg-white p-2.5 rounded border border-gray-200">"{req.reason}"</p>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button
                          onClick={() => handleRequestAction(req.id, "approve")}
                          disabled={processingId === req.id}
                          className="flex-1 md:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {processingId === req.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, "deny")}
                          disabled={processingId === req.id}
                          className="flex-1 md:flex-none px-3.5 py-2 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-300 disabled:opacity-50 text-gray-600 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {processingId === req.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Deny
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : currentView === "fleet" ? (
            <div className="w-full h-[600px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="absolute top-4 right-4 z-[400] bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm pointer-events-none">
                <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <MapPin size={13} /> Fleet map
                </p>
              </div>

              <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: "100%", width: "100%", zIndex: 1 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                <LocateControl />

                {mockFleet.map((worker) => (
                  <Marker key={worker.id} position={[worker.lat, worker.lng]}>
                    <Popup>
                      <div className="p-1 min-w-[150px]">
                        <p className="font-semibold text-sm">{worker.name}</p>
                        <p className="text-xs text-gray-500">{worker.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="card p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                        <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                        <Icon size={18} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Activity className="text-brand-600" size={16} />
                  Recent submissions
                </h2>

                {isLoading ? (
                  <div className="text-gray-400 text-center py-10 flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Loading…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {complaints.length === 0 ? (
                      <div className="col-span-full text-gray-400 text-center py-10">
                        No reports found.
                      </div>
                    ) : (
                      complaints.map((complaint) => (
                        <ComplaintCard key={complaint.id} complaint={complaint} />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
