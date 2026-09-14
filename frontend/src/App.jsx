import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Lazy-loaded pages for optimal performance and chunk splitting
// (Removed the duplicate static imports to prevent React crashes)
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword")); // Added ForgotPassword
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CitizenDashboard = lazy(() => import("./pages/CitizenDashboard"));
const DepartmentDashboard = lazy(() => import("./pages/DepartmentDashboard"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const ReportIssue = lazy(() => import("./pages/ReportIssue"));

/**
 * Security Checkpoint Wrapper
 * Ensures only authorized personnel can access protected routes.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="text-brand-600 animate-spin" />
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/**
 * Smart Routing Component
 * Automatically serves the correct dashboard UI based on the user's role.
 */
const DashboardController = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case "admin":
      return <AdminDashboard />;
    case "official":
      return <DepartmentDashboard />;
    case "worker":
      return <WorkerDashboard />;
    case "citizen":
    default:
      return <CitizenDashboard />;
  }
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-400 text-sm gap-2">
              <Loader2 size={20} className="animate-spin text-brand-600" />
              Loading…
            </div>
          }
        >
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />{" "}
            {/* Perfectly placed inside Routes! */}
            {/* Core Dynamic Route: Resolves based on user role */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardController />
                </ProtectedRoute>
              }
            />
            {/* Standalone Citizen Reporting Terminal */}
            <Route
              path="/report"
              element={
                <ProtectedRoute allowedRoles={["citizen", "admin"]}>
                  <ReportIssue />
                </ProtectedRoute>
              }
            />
            {/* Direct Role Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/department"
              element={
                <ProtectedRoute allowedRoles={["department", "admin"]}>
                  <DepartmentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/worker"
              element={
                <ProtectedRoute allowedRoles={["worker", "admin"]}>
                  <WorkerDashboard />
                </ProtectedRoute>
              }
            />
            {/* Root & Fallback Redirects */}
            {/* UPDATED: This now forces the app to open the Login page first! */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
