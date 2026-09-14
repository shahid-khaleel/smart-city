import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Always shown in IST, regardless of the viewer's own device/browser timezone.
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm">
      <Clock size={14} />
      <span>
        {time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
        {' · '}
        {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
        {' IST'}
      </span>
    </div>
  );
};

export default LiveClock;
