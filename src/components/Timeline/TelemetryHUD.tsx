import React from 'react';
import { Plane, Car, Train, Footprints, Navigation, MapPin, Gauge, Calendar } from 'lucide-react';
import { TimelineDataset, PlaybackState } from '../../types/timeline';
import { findNearestRegion, formatActivityType, getActivityColor } from '../../services/geoUtils';

interface TelemetryHUDProps {
  data: TimelineDataset;
  playback: PlaybackState;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ data, playback }) => {
  const { currentTime, isPlaying } = playback;

  // Find active activity and visit at currentTime
  const activeActivity = data.activities.find(
    (a) => a.startTime <= currentTime && a.endTime >= currentTime
  );

  const activeVisit = data.visits.find(
    (v) => v.startTime <= currentTime && v.endTime >= currentTime
  );

  // Determine current active coordinate
  let currentLat = 47.3769;
  let currentLng = 8.5417;
  let currentTransport = 'VISIT';
  let speedKmH = isPlaying ? 35 : 0;

  if (activeActivity) {
    currentLat = activeActivity.startLat;
    currentLng = activeActivity.startLng;
    currentTransport = activeActivity.type;
    speedKmH = activeActivity.type === 'FLYING' ? 840 : activeActivity.type === 'IN_TRAIN' ? 160 : 65;
  } else if (activeVisit) {
    currentLat = activeVisit.lat;
    currentLng = activeVisit.lng;
    currentTransport = 'VISIT';
    speedKmH = 0;
  }

  // Calculate cumulative distance up to currentTime
  const currentDistanceKm = data.activities
    .filter((a) => a.startTime <= currentTime)
    .reduce((sum, a) => sum + (a.distanceMeters > 0 ? a.distanceMeters / 1000 : 0), 0);

  const region = findNearestRegion(currentLat, currentLng);
  const formattedDate = new Date(currentTime).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = new Date(currentTime).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getTransportIcon = () => {
    switch (currentTransport) {
      case 'FLYING':
        return <Plane className="w-4 h-4 text-sky-400 animate-pulse" />;
      case 'IN_TRAIN':
      case 'IN_SUBWAY':
        return <Train className="w-4 h-4 text-purple-400" />;
      case 'WALKING':
      case 'RUNNING':
      case 'CYCLING':
        return <Footprints className="w-4 h-4 text-emerald-400" />;
      case 'IN_VEHICLE':
      case 'IN_PASSENGER_VEHICLE':
        return <Car className="w-4 h-4 text-amber-400" />;
      default:
        return <MapPin className="w-4 h-4 text-pink-400" />;
    }
  };

  return (
    <div className="absolute top-20 left-6 z-30 pointer-events-none flex flex-col gap-3 max-w-sm">
      {/* Date & Time Badge */}
      <div className="glass-panel p-4 flex items-center gap-3 border-l-4 border-l-cyan-400">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-mono">
            Active Timeline Date
          </div>
          <div className="text-lg font-bold text-white font-display flex items-baseline gap-2">
            {formattedDate}
            <span className="text-xs font-mono text-cyan-300 font-normal">
              {formattedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Location & Speed HUD */}
      <div className="glass-panel p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>LOCATION TELEMETRY</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${getActivityColor(currentTransport)}20`,
              color: getActivityColor(currentTransport),
              border: `1px solid ${getActivityColor(currentTransport)}50`,
            }}
          >
            {getTransportIcon()}
            <span>{formatActivityType(currentTransport)}</span>
          </div>
        </div>

        <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
          <span className="text-base">{region.country.split(' ')[0]}</span>
          <span className="truncate">{region.name}</span>
        </div>

        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-mono">Total Odomet.</div>
              <div className="text-xs font-bold text-slate-200 font-mono">
                {Math.round(currentDistanceKm).toLocaleString()} km
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-mono">Speed Sim</div>
              <div className="text-xs font-bold text-emerald-400 font-mono">
                {speedKmH} km/h
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
