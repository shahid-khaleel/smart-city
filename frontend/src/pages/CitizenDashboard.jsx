import React, { useState, useEffect } from "react";
import { UserCircle, History, Zap, Loader2, CheckCircle, Activity } from "lucide-react";
import { useLocation } from "react-router-dom";
import ComplaintForm from "../components/ComplaintForm";
import ComplaintCard from "../components/ComplaintCard";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import EditProfile from '../components/EditProfile';
import LiveClock from "../components/LiveClock";

const CitizenDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const currentView = queryParams.get("view") || "report";

  const [myComplaints, setMyComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logTab, setLogTab] = useState("Active");

  useEffect(() => {
    const fetchRealLogs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/complaints/", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch reports.");

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
          status: dbItem.status || "Pending review",
          image_url: dbItem.image_url,
          report_count: dbItem.report_count || 1,
        }));

        setMyComplaints(formattedData.sort((a, b) => b.id - a.id));
      } catch (error) {
        console.error("Dashboard connection error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealLogs();
  }, []);

  const handleNewSubmission = (savedComplaint) => {
    const formattedNewReport = {
      id: savedComplaint.id,
      title: savedComplaint.title,
      description: savedComplaint.description,
      category: savedComplaint.category || "General",
      location: savedComplaint.address || "Location pending",
      lat: savedComplaint.location_lat,
      lng: savedComplaint.location_lng,
      date: "Just now",
      created_at: savedComplaint.created_at || new Date().toISOString(),
      priority: savedComplaint.severity || "medium",
      status: savedComplaint.status || "Pending review",
      image_url: savedComplaint.image_url || null,
      report_count: savedComplaint.report_count || 1,
    };

    setMyComplaints((prev) => [formattedNewReport, ...prev]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredLogs = myComplaints.filter((log) => {
    const status = log.status.toLowerCase();
    return logTab === "Active" ? status !== "resolved" : status === "resolved";
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-5 md:p-7">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white border border-gray-200 rounded-lg text-brand-600">
                <UserCircle size={20} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Welcome{user?.full_name ? `, ${user.full_name}` : ""}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentView === 'settings' ? 'Manage your profile' : 'Report and track civic issues'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LiveClock />
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">{myComplaints.length} total reports</span>
              </div>
            </div>
          </div>

          {currentView === "settings" ? (
            <EditProfile />
          ) : currentView === "report" ? (
            <div className="space-y-3 max-w-4xl animate-in fade-in duration-300">
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" />
                <h2 className="text-sm font-medium text-gray-700">New report</h2>
              </div>
              <ComplaintForm onSubmit={handleNewSubmission} />
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setLogTab("Active")}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    logTab === "Active" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Activity size={14} /> Active
                </button>
                <button
                  onClick={() => setLogTab("Archive")}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    logTab === "Archive" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <CheckCircle size={15} /> Resolved
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  <div className="col-span-full flex items-center justify-center p-10 text-brand-600">
                    <Loader2 className="animate-spin" size={24} />
                  </div>
                ) : (
                  <>
                    {filteredLogs.map((complaint) => (
                      <ComplaintCard key={complaint.id} complaint={complaint} />
                    ))}

                    {filteredLogs.length === 0 && (
                      <div className="col-span-full p-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <History size={24} className="mx-auto text-gray-300 mb-2.5" />
                        <p className="text-gray-400 text-sm">No {logTab.toLowerCase()} reports found</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CitizenDashboard;
