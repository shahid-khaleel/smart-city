import React, { useState, useEffect, useRef } from "react";
import {
  LogOut,
  LayoutDashboard,
  Map,
  Zap,
  History,
  ChevronRight,
  ChevronLeft,
  Settings,
  FileText,
  Users,
  HardHat,
  ChevronDown,
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from '../assets/logo.svg';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const currentView = queryParams.get("view") || "overview";

  const basePath = user?.role === "admin" ? "/admin" : "/dashboard";

  const handleLogout = () => {
    if (logout) logout();
    else localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsExpanded(false);
        setIsReportsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const linkClass = (active) =>
    `flex items-center h-10 rounded-lg text-sm transition-all duration-150 ${
      active
        ? "bg-brand-50 text-brand-700"
        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
    } ${isExpanded ? "px-3 justify-start" : "justify-center"}`;

  const labelClass = `text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-200 ${
    isExpanded ? "w-auto opacity-100 ml-3" : "w-0 opacity-0 ml-0"
  }`;

  return (
    <div
      ref={sidebarRef}
      className={`${isExpanded ? "w-56 shadow-lg" : "w-16"} h-screen bg-white border-r border-gray-200 flex flex-col justify-between py-4 transition-all duration-200 relative z-50`}
    >
      {/* Positioned at the vertical middle of the sidebar edge so it never collides with the logo */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-full p-1 shadow-sm transition-all duration-150 z-[60]"
        title={isExpanded ? "Collapse menu" : "Expand menu"}
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={`flex items-center ${isExpanded ? "px-4 justify-start" : "justify-center"} mb-6 transition-all duration-200`}>
          <img
            src={logo}
            alt="SmartCity Connect"
            className="w-8 h-8 min-w-[32px] rounded-lg border border-gray-200 object-cover"
          />
          <div className={`overflow-hidden whitespace-nowrap transition-all duration-200 flex flex-col justify-center ${isExpanded ? "w-28 opacity-100 ml-2.5" : "w-0 opacity-0 ml-0"}`}>
            <h2 className="font-semibold text-gray-900 text-xs leading-tight">SmartCity</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Connect</p>
          </div>
        </div>

        <nav className="flex flex-col px-2.5 space-y-1">
          {user?.role === "admin" && (
            <>
              <Link to="/admin" onClick={() => setIsExpanded(false)} className={linkClass(currentView === "overview")} title="Overview">
                <LayoutDashboard size={17} className="min-w-[17px]" />
                <span className={labelClass}>Overview</span>
              </Link>

              <Link to="/admin?view=fleet" onClick={() => setIsExpanded(false)} className={linkClass(currentView === "fleet")} title="Fleet map">
                <Map size={17} className="min-w-[17px]" />
                <span className={labelClass}>Fleet map</span>
              </Link>

              <div className="flex flex-col overflow-hidden">
                <button
                  onClick={() => {
                    setIsExpanded(true);
                    setIsReportsOpen(!isReportsOpen);
                  }}
                  className={`flex items-center h-10 rounded-lg text-sm transition-all duration-150 text-gray-500 hover:text-gray-800 hover:bg-gray-100 ${isExpanded ? "px-3 justify-start" : "justify-center"}`}
                  title="Requests"
                >
                  <FileText size={17} className="min-w-[17px]" />
                  <span className={`text-sm font-medium flex-1 text-left whitespace-nowrap transition-all duration-200 ${isExpanded ? "w-auto opacity-100 ml-3" : "w-0 opacity-0 ml-0"}`}>
                    Requests
                  </span>
                  {isExpanded && <ChevronDown size={14} className={`transition-transform duration-200 ${isReportsOpen ? "rotate-180" : ""}`} />}
                </button>

                <div className={`flex flex-col pl-10 space-y-0.5 transition-all duration-200 ${isReportsOpen && isExpanded ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0 pointer-events-none"}`}>
                  <Link
                    to="/admin?view=requests&filter=dept"
                    className={`flex items-center h-9 text-xs transition-colors ${currentView === 'requests' && queryParams.get('filter') === 'dept' ? 'text-brand-700 font-medium' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    <Users size={13} className="mr-2 min-w-[13px]" /> Department requests
                  </Link>
                  <Link
                    to="/admin?view=requests&filter=worker"
                    className={`flex items-center h-9 text-xs transition-colors ${currentView === 'requests' && queryParams.get('filter') === 'worker' ? 'text-brand-700 font-medium' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    <HardHat size={13} className="mr-2 min-w-[13px]" /> Worker requests
                  </Link>
                </div>
              </div>
            </>
          )}

          {user?.role === "citizen" && (
            <>
              <Link
                to="/dashboard"
                onClick={() => setIsExpanded(false)}
                className={linkClass(currentView === "overview" || currentView === "report")}
                title="New report"
              >
                <Zap size={17} className="min-w-[17px]" />
                <span className={labelClass}>New report</span>
              </Link>

              <Link
                to="/dashboard?view=logs"
                onClick={() => setIsExpanded(false)}
                className={linkClass(currentView === "logs")}
                title="My reports"
              >
                <History size={17} className="min-w-[17px]" />
                <span className={labelClass}>My reports</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="flex flex-col space-y-1 px-2.5 pt-3 border-t border-gray-200">
        <Link to={`${basePath}?view=settings`} onClick={() => setIsExpanded(false)} className={linkClass(currentView === "settings")} title="Profile settings">
          <Settings size={17} className="min-w-[17px]" />
          <span className={labelClass}>Settings</span>
        </Link>

        <button
          onClick={handleLogout}
          className={`flex items-center h-10 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 w-full ${isExpanded ? "px-3 justify-start" : "justify-center"}`}
          title="Log out"
        >
          <LogOut size={17} className="min-w-[17px]" />
          <span className={labelClass}>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
