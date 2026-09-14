import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Copy, AlertTriangle } from 'lucide-react';
import ComplaintForm from '../components/ComplaintForm';
import { useAuth } from '../context/AuthContext';

const ReportIssue = () => {
  const { user } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState('');

  const handleFormSubmit = (savedComplaint) => {
    // ComplaintForm already POSTs the report to the backend (authenticated,
    // with the AI triage pipeline) and hands us back the saved complaint here —
    // no need to submit again.
    const realId = savedComplaint?.id
      ? `REP-${String(savedComplaint.id).padStart(6, '0')}`
      : `REP-${Math.floor(100000 + Math.random() * 900000)}`;

    setTrackingId(realId);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(trackingId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-5 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm">
            <ArrowLeft size={15} /> Back to dashboard
          </a>
        </div>

        {!isSubmitted ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Report a new issue</h1>
              <p className="text-xs text-gray-500 mt-0.5">All fields are required unless marked optional</p>
            </div>

            <div className="p-3.5 border border-amber-200 bg-amber-50 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-amber-800 leading-relaxed">
                For life-threatening emergencies or crimes in progress, contact emergency services directly. This system is for non-emergency municipal issues only.
              </p>
            </div>

            <ComplaintForm onSubmit={handleFormSubmit} />
          </div>
        ) : (
          <div className="card p-6 text-center space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200">
              <CheckCircle size={26} className="text-emerald-600" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900">Report submitted</h2>
              <p className="text-sm text-gray-500 mt-1">
                Your report has been sent to the relevant department.
              </p>
            </div>

            <div className="max-w-xs mx-auto p-5 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Tracking ID</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-semibold text-gray-900 tracking-wide">{trackingId}</span>
                <button onClick={copyToClipboard} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors" title="Copy tracking ID">
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="/dashboard" className="btn-secondary w-full sm:w-auto">
                Return to dashboard
              </a>
              <button onClick={() => setIsSubmitted(false)} className="btn-primary w-full sm:w-auto">
                Report another issue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportIssue;
