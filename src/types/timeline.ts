export type ActivityType =
  | 'FLYING'
  | 'IN_VEHICLE'
  | 'IN_PASSENGER_VEHICLE'
  | 'IN_TRAIN'
  | 'IN_SUBWAY'
  | 'IN_TRAM'
  | 'IN_BUS'
  | 'IN_FERRY'
  | 'IN_TAXI'
  | 'CYCLING'
  | 'WALKING'
  | 'RUNNING'
  | 'SKIING'
  | 'SKATEBOARDING'
  | 'BOATING'
  | 'MOTORCYCLING'
  | 'UNKNOWN'
  | 'VISIT';

export interface GPSPoint {
  lat: number;
  lng: number;
  time: number; // epoch ms
  altitude?: number;
}

export interface TimelineVisit {
  id: string;
  placeId?: string;
  name?: string;
  address?: string;
  semanticType?: string; // 'HOME' | 'WORK' | 'SEARCHED_ADDRESS' | 'UNKNOWN'
  lat: number;
  lng: number;
  startTime: number;
  endTime: number;
  durationMinutes: number;
}

export interface TimelineActivity {
  id: string;
  type: ActivityType;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceMeters: number;
  startTime: number;
  endTime: number;
  probability?: number;
  pathPoints?: GPSPoint[];
}

export interface TripArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startTime: number;
  endTime: number;
  type: ActivityType | string;
  distanceKm: number;
  color: string;
  altitude?: number;
  label?: string;
}

export interface TripCluster {
  id: string;
  title: string;
  subtitle: string;
  startDate: number;
  endDate: number;
  centerLat: number;
  centerLng: number;
  activitiesCount: number;
  distanceKm: number;
  mainTransport: ActivityType | string;
  pointsCount: number;
  flightCount: number;
}

export interface TimelineDataset {
  summary: {
    totalPoints: number;
    totalVisits: number;
    totalActivities: number;
    totalDistanceKm: number;
    minTime: number;
    maxTime: number;
    countriesCount: number;
    citiesCount: number;
    flightCount: number;
    yearSpan: number[];
  };
  points: GPSPoint[];
  visits: TimelineVisit[];
  activities: TimelineActivity[];
  arcs: TripArc[];
  trips: TripCluster[];
}

export type GlobeTheme = 'midnight-blue' | 'dark-neon' | 'realistic-earth' | 'cyberpunk' | 'topographic';

export interface LayerVisibility {
  arcs: boolean;
  trails: boolean;
  heatmap: boolean;
  markers: boolean;
  labels: boolean;
  atmosphere: boolean;
  clouds: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  speedMultiplier: number;
  loop: boolean;
  rangeStart: number;
  rangeEnd: number;
  autoFly: boolean;
}

export type CameraMode = 'free' | 'follow-trip' | 'orbit' | 'cinematic';

export interface StoryExportConfig {
  aspectRatio: '9:16' | '1:1' | '16:9';
  title: string;
  subtitle: string;
  showTelemetry: boolean;
  showDateBadge: boolean;
  showMusicSticker: boolean;
  showProgressBar: boolean;
  themeColor: string;
  durationSeconds: number;
  fps: number;
}
