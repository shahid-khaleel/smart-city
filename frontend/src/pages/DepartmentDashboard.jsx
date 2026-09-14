import React, { useState, useEffect } from "react";
import { Wrench, Filter, Loader2, MapPin, Navigation, Truck } from "lucide-react";
import { useLocation } from "react-router-dom";
import ComplaintCard from "../components/ComplaintCard";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import EditProfile from '../components/EditProfile';
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
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 14, { duration: 1.5 });
      }, () => alert("Could not get your location."));
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

const DepartmentDashboard = () => {
  const { user } = useAuth();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentView = queryParams.get("view") || "dispatch";

  const [activeFilter, setActiveFilter] = useState("All");

  const [departmentTasks, setDepartmentTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dispatchingTaskId, setDispatchingTaskId] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);

  const defaultCenter = [12.9716, 77.5946];

  // Real field workers, fetched from the backend instead of hardcoded IDs
  // (the old hardcoded list pointed one option at the official's own account).
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    fetchRealLogs();
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/department/workers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setWorkers(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch field workers:", error);
    }
  };

  const fetchRealLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/complaints/", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch tasks.");

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
        status: dbItem.status || "Pending",
        image_url: dbItem.image_url,
        report_count: dbItem.report_count || 1
      }));

      setDepartmentTasks(formattedData.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("Dashboard connection error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatch = async (taskId) => {
    if (!selectedWorkerId) {
      alert("Please select a field unit to dispatch.");
      return;
    }

    setIsDispatching(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/department/complaints/${taskId}/assign?worker_id=${selectedWorkerId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to dispatch unit.");

      setDepartmentTasks((prevTasks) =>
        prevTasks.map((task) => task.id === taskId ? { ...task, status: "Assigned" } : task)
      );

      setDispatchingTaskId(null);
      setSelectedWorkerId("");
    } catch (error) {
      console.error("Dispatch error:", error);
      alert("Failed to dispatch. Please try again.");
    } finally {
      setIsDispatching(false);
    }
  };

  const filteredTasks = departmentTasks.filter((task) => {
    if (activeFilter === "All") return true;

    if (activeFilter === "Pending") {
      const statusLower = task.status.toLowerCase();
      return statusLower.includes("pending") || statusLower.includes("submitted");
    }

    return task.status === activeFilter;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-5 md:p-7">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white border border-gray-200 rounded-lg text-brand-600">
                <Wrench size={20} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Dispatch center</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user?.name || "Department official"}
                  {currentView === 'settings' && " · Profile settings"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LiveClock />
              <div className="px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-700">
                2 active units
              </div>
            </div>
          </div>

          {currentView === "settings" ? (
            <EditProfile />
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Filters */}
              <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Filter size={14} />
                  <span>Filter:</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["All", "Pending", "Assigned", "Resolved"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        activeFilter === filter
                          ? "bg-gray-900 border-gray-900 text-white"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center p-12 text-brand-600">
                  <Loader2 className="animate-spin" size={28} />
                </div>
              ) : (
                <>
                  {/* Map */}
                  <div className="w-full h-[340px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative">
                    <div className="absolute top-4 right-4 z-[400] bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm pointer-events-none">
                      <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                        <MapPin size={13} /> Task locations
                      </p>
                    </div>

                    <MapContainer center={defaultCenter} zoom={12} style={{ height: "100%", width: "100%", zIndex: 1 }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                      <LocateControl />

                      {filteredTasks.filter((t) => t.lat && t.lng).map((task) => (
                        <Marker key={`map-${task.id}`} position={[task.lat, task.lng]}>
                          <Popup>
                            <div className="p-1 min-w-[200px]">
                              <p className="font-semibold text-sm mb-0.5">{task.title}</p>
                              <p className="text-xs text-gray-500 mb-3">{task.status}</p>

                              {(task.status.toLowerCase().includes("pending") || task.status.toLowerCase().includes("submitted")) && (
                                <button
                                  onClick={() => {
                                    setDispatchingTaskId(task.id);
                                    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                                  }}
                                  className="w-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium py-2 rounded-md transition-colors"
                                >
                                  Dispatch a unit
                                </button>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>

                  {/* Task list header */}
                  <div className="flex items-center gap-3 pt-1">
                    <h2 className="text-sm font-medium text-gray-700">{activeFilter} tasks</h2>
                    <span className="badge badge-gray ml-auto">{filteredTasks.length} results</span>
                  </div>

                  {/* Task list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map((task) => (
                      <div key={task.id} className="flex flex-col h-full">
                        <ComplaintCard complaint={task} />

                        {(task.status.toLowerCase().includes("pending") || task.status.toLowerCase().includes("submitted") || task.status.toLowerCase().includes("open")) && (
                          <div className="mt-2">
                            {dispatchingTaskId === task.id ? (
                              <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
                                <label className="label mb-0">Select field unit</label>

                                <select
                                  className="input"
                                  value={selectedWorkerId}
                                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                                >
                                  <option value="">— Select a unit —</option>
                                  {workers.length === 0 ? (
                                    <option value="" disabled>No field workers available</option>
                                  ) : (
                                    workers.map((w) => (
                                      <option key={w.id} value={w.id}>{w.full_name}</option>
                                    ))
                                  )}
                                </select>

                                <div className="flex gap-2">
                                  <button onClick={() => setDispatchingTaskId(null)} className="btn-secondary flex-1 py-2 text-xs">
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDispatch(task.id)}
                                    disabled={isDispatching}
                                    className="btn-primary flex-1 py-2 text-xs"
                                  >
                                    {isDispatching ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                                    Dispatch
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDispatchingTaskId(task.id)}
                                className="w-full bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-600 hover:text-brand-700 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                              >
                                <Truck size={15} /> Assign to field unit
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {filteredTasks.length === 0 && (
                      <div className="col-span-full p-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <p className="text-gray-400 text-sm">No tasks match this filter</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DepartmentDashboard;
