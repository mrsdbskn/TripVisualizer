import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plane,
  MapPin,
  Calendar,
  Globe2,
} from 'lucide-react';
import { TimelineDataset } from '../../types/timeline';
import { parseTimelineData } from '../../services/parser';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (data: TimelineDataset) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded,
}) => {
  if (!isOpen) return null;

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<TimelineDataset | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);
    setProgressPercent(10);
    setProgressStage(`Reading ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = 10 + (e.loaded / e.total) * 30;
        setProgressPercent(pct);
      }
    };

    reader.onload = (e) => {
      try {
        setProgressStage('Parsing JSON text...');
        setProgressPercent(45);

        const text = e.target?.result as string;
        const json = JSON.parse(text);

        setProgressStage('Processing timeline paths & spatial telemetry...');
        setProgressPercent(60);

        // Process in short timeout to allow UI update
        setTimeout(() => {
          try {
            const dataset = parseTimelineData(json, (pct, stage) => {
              setProgressPercent(60 + pct * 35);
              setProgressStage(stage);
            });

            setIsLoading(false);
            setProgressPercent(100);
            setProgressStage('Parsing Complete!');
            setParsedPreview(dataset);
          } catch (err: any) {
            setIsLoading(false);
            setErrorMsg(err?.message || 'Failed to process timeline segments');
          }
        }, 50);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg('Invalid JSON syntax: ' + err.message);
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      setErrorMsg('Failed to read file from disk');
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyDataset = () => {
    if (parsedPreview) {
      onDatasetLoaded(parsedPreview);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-lg">
      <div className="glass-panel p-6 max-w-xl w-full border border-cyan-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Import Location JSON</h3>
              <p className="text-xs text-slate-400 font-mono">
                Google Takeout Timeline.json or Records.json
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        {!parsedPreview && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                : 'border-white/15 hover:border-cyan-400/50 hover:bg-white/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white font-display">
                Drop your <span className="text-cyan-400">Timeline.json</span> here, or Browse
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Supports Google Takeout Semantic History & Records JSON (up to 200MB+)
              </div>
            </div>
          </div>
        )}

        {/* Loading Progress */}
        {isLoading && (
          <div className="glass-panel p-4 border border-cyan-500/40 bg-cyan-950/20 flex flex-col gap-2.5 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold">{progressStage}</span>
              <span className="text-white font-bold">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="glass-panel p-4 border border-red-500/50 bg-red-950/20 flex items-center gap-3 text-red-300 text-xs font-mono">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Parsed Summary Preview */}
        {parsedPreview && (
          <div className="glass-panel p-5 border border-emerald-500/40 bg-emerald-950/10 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm font-display">
              <CheckCircle2 className="w-5 h-5" />
              <span>Dataset Successfully Parsed!</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">GPS Points</div>
                <div className="text-sm font-bold text-cyan-400">
                  {parsedPreview.summary.totalPoints.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Visits / Places</div>
                <div className="text-sm font-bold text-pink-400">
                  {parsedPreview.summary.totalVisits.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Flights & Arcs</div>
                <div className="text-sm font-bold text-amber-400">
                  {parsedPreview.summary.flightCount} Arcs
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Total Mileage</div>
                <div className="text-sm font-bold text-emerald-400">
                  {Math.round(parsedPreview.summary.totalDistanceKm).toLocaleString()} km
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-300 font-mono flex items-center justify-between border-t border-white/10 pt-3">
              <span>
                Timeline Span:{' '}
                {new Date(parsedPreview.summary.minTime).getFullYear()} –{' '}
                {new Date(parsedPreview.summary.maxTime).getFullYear()}
              </span>
              <span>{parsedPreview.summary.countriesCount} Countries Visited</span>
            </div>

            <button
              onClick={handleApplyDataset}
              className="w-full glass-button-primary justify-center py-3 text-xs uppercase font-mono tracking-wider font-bold"
            >
              <Sparkles className="w-4 h-4" />
              Visualize On 3D Globe
            </button>
          </div>
        )}

        {/* Security & Privacy note */}
        <div className="text-[11px] text-slate-400 font-mono text-center">
          🔒 100% Private & Client-Side: Your JSON file is processed entirely in your browser memory and never uploaded to any remote server.
        </div>
      </div>
    </div>
  );
};
