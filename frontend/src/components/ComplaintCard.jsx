import React, { useState } from 'react';
import { MapPin, Clock, Camera, X, Users, AlertTriangle, Layers, Calendar } from 'lucide-react';

const formatTimestamp = (isoString) => {
  if (!isoString) return { date: 'Unavailable', time: '' };
  if (isoString === 'Just now') return { date: 'Today', time: 'Just now' };

  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: isoString, time: '' };

    // Always shown in IST, regardless of the viewer's own device/browser timezone.
    const dateStr = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d);
    const timeStr = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(d);

    return { date: dateStr, time: timeStr };
  } catch (e) {
    return { date: isoString, time: '' };
  }
};

const ComplaintCard = ({ complaint }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    title = 'Untitled issue',
    description = 'No description provided.',
    location = 'Location pending',
    date = 'Just now',
    created_at = null,
    priority = 'low',
    status = 'Pending',
    image_url = null,
    report_count = 1,
    category = 'General',
  } = complaint || {};

  const priorityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'badge-red';
      case 'medium': return 'badge-amber';
      case 'low': return 'badge-green';
      default: return 'badge-gray';
    }
  };

  const statusBadge = (s) => {
    switch (s?.toLowerCase()) {
      case 'resolved': return 'badge-green';
      case 'assigned': return 'badge-blue';
      default: return 'badge-amber';
    }
  };

  const isCluster = report_count > 1;
  const timeInfo = formatTimestamp(created_at || date);

  return (
    <>
      <div className={`card group flex flex-col h-full p-4 transition-all duration-200 hover:-translate-y-0.5 animate-in fade-in zoom-in-95 duration-300 ${isCluster ? 'border-red-200' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Layers size={12} className="text-gray-400" />
            {category}
          </div>
          <span className={`badge shrink-0 ${priorityBadge(priority)}`}>{priority}</span>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate" title={title}>
          {title}
        </h3>

        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed flex-grow-0">
          {description}
        </p>

        {isCluster && (
          <div className="flex items-center gap-1.5 mb-3 bg-red-50 border border-red-200 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-medium w-fit">
            <AlertTriangle size={12} />
            Reported by {report_count} citizens
          </div>
        )}

        {image_url && (
          <div
            onClick={() => setIsModalOpen(true)}
            className="mb-3 relative h-28 w-full rounded-lg overflow-hidden border border-gray-200 cursor-pointer group/image bg-gray-100"
          >
            <img
              src={image_url}
              alt="Complaint evidence"
              className="object-cover w-full h-full transition-transform duration-500 group-hover/image:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 bg-black/40">
              <span className="flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 px-2.5 py-1 rounded-md">
                <Camera size={12} /> View photo
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-auto bg-gray-50 p-2 rounded-lg border border-gray-100">
          <MapPin size={12} className="text-gray-400 shrink-0" />
          <span className="truncate">{location || 'Location pending'}</span>
          {!isCluster && (
            <span className="ml-auto flex items-center gap-1 text-gray-400 shrink-0">
              <Users size={10} /> 1
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-end">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Calendar size={10} /> {timeInfo.date}
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Clock size={10} /> {timeInfo.time}
            </span>
          </div>

          <span className={`badge ${statusBadge(status)}`}>{status}</span>
        </div>
      </div>

      {isModalOpen && image_url && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={image_url}
              alt="Evidence fullscreen"
              className="max-w-full max-h-[90vh] rounded-xl object-contain bg-white shadow-2xl"
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-white text-gray-600 hover:text-gray-900 rounded-full p-2 shadow-lg transition-transform hover:scale-105"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ComplaintCard;
