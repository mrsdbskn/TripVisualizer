import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plane,
  Car,
  Train,
  MapPin,
  Calendar,
  Sparkles,
  Play,
  Pause,
  Compass,
} from 'lucide-react';
import { TimelineDataset, TripCluster } from '../../types/timeline';
import { getActivityColor, formatActivityType } from '../../services/geoUtils';

interface TripSlideshowProps {
  data: TimelineDataset;
  onSelectTrip: (trip: TripCluster) => void;
}

export const TripSlideshow: React.FC<TripSlideshowProps> = ({ data, onSelectTrip }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoSlide, setIsAutoSlide] = useState(false);

  const trips = data.trips;
  const currentTrip = trips[currentIndex] || trips[0];

  useEffect(() => {
    if (currentIndex >= trips.length) {
      setCurrentIndex(0);
    }
  }, [trips.length]);

  // Auto-advance slideshow if enabled
  useEffect(() => {
    if (!isAutoSlide || trips.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % trips.length;
        onSelectTrip(trips[next]);
        return next;
      });
    }, 6000);

    return () => clearInterval(timer);
  }, [isAutoSlide, trips, onSelectTrip]);

  if (!currentTrip || trips.length === 0) return null;

  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + trips.length) % trips.length;
    setCurrentIndex(nextIdx);
    onSelectTrip(trips[nextIdx]);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % trips.length;
    setCurrentIndex(nextIdx);
    onSelectTrip(trips[nextIdx]);
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'FLYING':
        return <Plane className="w-4 h-4 text-sky-400 animate-pulse" />;
      case 'IN_TRAIN':
        return <Train className="w-4 h-4 text-purple-400" />;
      case 'IN_VEHICLE':
        return <Car className="w-4 h-4 text-amber-400" />;
      default:
        return <Compass className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed top-20 right-6 z-40 max-w-sm w-80 select-none">
      <div className="glass-panel p-4 border border-cyan-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-xl flex flex-col gap-3">
        {/* Slideshow Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>JOURNEY SLIDE {currentIndex + 1} OF {trips.length}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsAutoSlide(!isAutoSlide)}
            title={isAutoSlide ? 'Pause Slideshow' : 'Play Auto-Tour Slideshow'}
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer border ${
              isAutoSlide
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            {isAutoSlide ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isAutoSlide ? 'AUTO' : 'TOUR'}</span>
          </button>
        </div>

        {/* Slide Content */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg border"
              style={{
                backgroundColor: `${getActivityColor(currentTrip.mainTransport)}20`,
                borderColor: `${getActivityColor(currentTrip.mainTransport)}50`,
              }}
            >
              {getTransportIcon(currentTrip.mainTransport)}
            </div>
            <h3 className="font-display font-bold text-sm text-white leading-snug line-clamp-2">
              {currentTrip.title}
            </h3>
          </div>

          <p className="text-xs text-slate-300 font-mono">
            {currentTrip.subtitle}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-white/5 text-[11px] font-mono text-slate-400">
            <div>
              <span className="text-[9px] uppercase text-slate-400 block">Distance</span>
              <span className="text-cyan-300 font-bold text-xs">{currentTrip.distanceKm.toLocaleString()} km</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block">Transport</span>
              <span className="text-pink-300 font-bold text-xs">{formatActivityType(currentTrip.mainTransport)}</span>
            </div>
          </div>
        </div>

        {/* Slide Controls Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handlePrev}
            className="glass-button text-xs py-1.5 px-3 rounded-lg text-slate-300 hover:text-white border-white/10 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1">
            {trips.slice(0, 6).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  onSelectTrip(trips[idx]);
                }}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx ? 'bg-cyan-400 w-4 shadow-sm shadow-cyan-400' : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="glass-button text-xs py-1.5 px-3 rounded-lg text-cyan-300 hover:text-white border-cyan-500/30 flex items-center gap-1 cursor-pointer font-bold"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
