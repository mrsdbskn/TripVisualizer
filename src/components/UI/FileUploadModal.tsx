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
  Zap,
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

  const processJsonText = (jsonText: string) => {
    try {
      setProgressStage('Parsing JSON structure...');
      setProgressPercent(45);

      const json = JSON.parse(jsonText);

      setProgressStage('Extracting GPS trajectories & spatial telemetry...');
      setProgressPercent(60);

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
      const text = e.target?.result as string;
      processJsonText(text);
    };

    reader.onerror = () => {
      setIsLoading(false);
      setErrorMsg('Failed to read file from disk');
    };

    reader.readAsText(file);
  };

  const handleLoadWorkspaceTimeline = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    setProgressPercent(15);
    setProgressStage('Fetching Timeline.json from workspace (99.9 MB)...');

    try {
      const response = await fetch('./Timeline.json');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} loading Timeline.json`);
      }
      setProgressPercent(40);
      setProgressStage('Reading JSON stream from workspace...');
      const text = await response.text();
      processJsonText(text);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Could not fetch Timeline.json: ' + err.message);
    }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="glass-panel p-6 max-w-xl w-full border border-cyan-500/40 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5 bg-slate-950/95">
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
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Load Workspace Timeline.json Banner */}
        {!parsedPreview && !isLoading && (
          <div className="glass-panel p-4 border border-amber-500/40 bg-amber-950/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-display font-bold text-sm text-white">
                  Local Timeline.json Detected!
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  c:\Users\mrsdb\TripVisualizer\Timeline.json (99.9 MB)
                </div>
              </div>
            </div>
            <button
              onClick={handleLoadWorkspaceTimeline}
              className="glass-button bg-amber-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl hover:bg-amber-400 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              1-Click Load
            </button>
          </div>
        )}

        {/* Drop Zone */}
        {!parsedPreview && !isLoading && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
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
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white font-display">
                Drop any custom <span className="text-cyan-400">Timeline.json</span> from your device
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Supports Google Takeout Semantic History, Records.json, & GeoJSON
              </div>
            </div>
          </div>
        )}

        {/* Loading Progress */}
        {isLoading && (
          <div className="glass-panel p-5 border border-cyan-500/40 bg-cyan-950/20 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold">{progressStage}</span>
              <span className="text-white font-bold">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
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
              <span>Dataset Successfully Processed!</span>
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
                Span:{' '}
                {new Date(parsedPreview.summary.minTime).getFullYear()} –{' '}
                {new Date(parsedPreview.summary.maxTime).getFullYear()} ({parsedPreview.summary.yearSpan.length} Years)
              </span>
              <span>{parsedPreview.summary.countriesCount} Countries</span>
            </div>

            <button
              onClick={handleApplyDataset}
              className="w-full glass-button-primary justify-center py-3 text-xs uppercase font-mono tracking-wider font-bold cursor-pointer"
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
