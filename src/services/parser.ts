import {
  ActivityType,
  GPSPoint,
  TimelineActivity,
  TimelineDataset,
  TimelineVisit,
  TripArc,
} from '../types/timeline';
import { parseLatLng, haversineDistanceKm, getActivityColor, findNearestRegion } from './geoUtils';
import { clusterTrips } from './tripClustering';

export interface ParseProgressCallback {
  (progress: number, stage: string): void;
}

/**
 * High-performance parser for Google Location History & Takeout JSON formats
 */
export function parseTimelineData(
  jsonData: any,
  onProgress?: ParseProgressCallback
): TimelineDataset {
  onProgress?.(0.1, 'Analyzing JSON structure...');

  const points: GPSPoint[] = [];
  const visits: TimelineVisit[] = [];
  const activities: TimelineActivity[] = [];
  const arcs: TripArc[] = [];
  const visitedCountries = new Set<string>();
  const visitedCities = new Set<string>();
  let totalDistanceKm = 0;
  let flightCount = 0;

  // Format 1: Google Takeout Semantic Location History (semanticSegments)
  if (jsonData && Array.isArray(jsonData.semanticSegments)) {
    const segments = jsonData.semanticSegments;
    const totalSegments = segments.length;
    const reportInterval = Math.max(1, Math.floor(totalSegments / 20));

    for (let i = 0; i < totalSegments; i++) {
      if (i % reportInterval === 0 && onProgress) {
        onProgress(0.1 + (i / totalSegments) * 0.7, `Processing segment ${i.toLocaleString()} of ${totalSegments.toLocaleString()}...`);
      }

      const seg = segments[i];
      const startEpoch = seg.startTime ? new Date(seg.startTime).getTime() : 0;
      const endEpoch = seg.endTime ? new Date(seg.endTime).getTime() : startEpoch;

      // 1. Process Visits
      if (seg.visit) {
        const top = seg.visit.topCandidate;
        const coords = parseLatLng(top?.placeLocation?.latLng || top?.placeLocation || seg.visit);
        if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
          const duration = Math.max(1, Math.round((endEpoch - startEpoch) / (1000 * 60)));
          const region = findNearestRegion(coords.lat, coords.lng);
          visitedCountries.add(region.country);
          visitedCities.add(region.name);

          visits.push({
            id: `visit-${visits.length}`,
            placeId: top?.placeId,
            semanticType: top?.semanticType || 'UNKNOWN',
            name: region.name,
            lat: coords.lat,
            lng: coords.lng,
            startTime: startEpoch,
            endTime: endEpoch,
            durationMinutes: duration,
          });

          points.push({
            lat: coords.lat,
            lng: coords.lng,
            time: startEpoch,
          });
        }
      }

      // 2. Process Activities
      if (seg.activity) {
        const topAct = seg.activity.topCandidate;
        const type = (topAct?.type || 'UNKNOWN') as ActivityType;
        const startCoords = parseLatLng(seg.activity.start?.latLng || seg.activity.start);
        const endCoords = parseLatLng(seg.activity.end?.latLng || seg.activity.end);
        const distanceM = typeof seg.activity.distanceMeters === 'number' ? seg.activity.distanceMeters : 0;

        if (startCoords && endCoords) {
          const distKm = distanceM > 0 ? distanceM / 1000 : haversineDistanceKm(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
          totalDistanceKm += distKm;

          if (type === 'FLYING') {
            flightCount++;
          }

          const startRegion = findNearestRegion(startCoords.lat, startCoords.lng);
          const endRegion = findNearestRegion(endCoords.lat, endCoords.lng);
          visitedCountries.add(startRegion.country);
          visitedCountries.add(endRegion.country);
          visitedCities.add(startRegion.name);
          visitedCities.add(endRegion.name);

          const activityObj: TimelineActivity = {
            id: `act-${activities.length}`,
            type,
            startLat: startCoords.lat,
            startLng: startCoords.lng,
            endLat: endCoords.lat,
            endLng: endCoords.lng,
            distanceMeters: Math.round(distKm * 1000),
            startTime: startEpoch,
            endTime: endEpoch,
            probability: topAct?.probability,
          };
          activities.push(activityObj);

          // Generate 3D Arcs for Flights or Long Distance Transits (> 50 km)
          if (type === 'FLYING' || distKm > 60) {
            arcs.push({
              id: `arc-${arcs.length}`,
              startLat: startCoords.lat,
              startLng: startCoords.lng,
              endLat: endCoords.lat,
              endLng: endCoords.lng,
              startTime: startEpoch,
              endTime: endEpoch,
              type,
              distanceKm: Math.round(distKm),
              color: getActivityColor(type),
              altitude: type === 'FLYING' ? 0.35 : 0.15,
              label: `${startRegion.name.split(',')[0]} ➔ ${endRegion.name.split(',')[0]} (${Math.round(distKm)} km)`,
            });
          }
        }
      }

      // 3. Process Timeline Path points
      if (Array.isArray(seg.timelinePath)) {
        for (const pt of seg.timelinePath) {
          const coords = parseLatLng(pt.point || pt);
          const t = pt.time ? new Date(pt.time).getTime() : startEpoch;
          if (coords) {
            points.push({
              lat: coords.lat,
              lng: coords.lng,
              time: t,
            });
          }
        }
      }
    }
  }

  // Format 2: Google Takeout Records.json (locations: [ { latitudeE7, longitudeE7, timestamp } ])
  else if (jsonData && Array.isArray(jsonData.locations)) {
    const rawLocations = jsonData.locations;
    const total = rawLocations.length;
    for (let i = 0; i < total; i++) {
      const loc = rawLocations[i];
      const coords = parseLatLng(loc);
      if (coords) {
        const time = loc.timestamp ? new Date(loc.timestamp).getTime() : (loc.timestampMs ? parseInt(loc.timestampMs) : 0);
        points.push({ lat: coords.lat, lng: coords.lng, time });
      }
    }
  }

  // Format 3: GeoJSON FeatureCollection
  else if (jsonData && jsonData.type === 'FeatureCollection' && Array.isArray(jsonData.features)) {
    for (const f of jsonData.features) {
      if (f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
        const [lng, lat] = f.geometry.coordinates;
        const time = f.properties?.time ? new Date(f.properties.time).getTime() : Date.now();
        points.push({ lat, lng, time });
      } else if (f.geometry?.type === 'LineString' && Array.isArray(f.geometry.coordinates)) {
        for (const [lng, lat] of f.geometry.coordinates) {
          points.push({ lat, lng, time: Date.now() });
        }
      }
    }
  }

  onProgress?.(0.85, 'Clustering trips & indexing spatial telemetry...');

  // Sort chronological
  points.sort((a, b) => a.time - b.time);
  visits.sort((a, b) => a.startTime - b.startTime);
  activities.sort((a, b) => a.startTime - b.startTime);
  arcs.sort((a, b) => a.startTime - b.startTime);

  // Compute trips
  const trips = clusterTrips(activities, visits);

  // Calculate timestamp boundaries
  const allTimestamps: number[] = [];
  if (points.length > 0) {
    allTimestamps.push(points[0].time, points[points.length - 1].time);
  }
  if (activities.length > 0) {
    allTimestamps.push(activities[0].startTime, activities[activities.length - 1].endTime);
  }
  if (visits.length > 0) {
    allTimestamps.push(visits[0].startTime, visits[visits.length - 1].endTime);
  }

  const minTime = allTimestamps.length > 0 ? Math.min(...allTimestamps.filter((t) => t > 0)) : Date.now() - 365 * 24 * 3600 * 1000;
  const maxTime = allTimestamps.length > 0 ? Math.max(...allTimestamps.filter((t) => t > 0)) : Date.now();

  // Find unique years
  const startYear = new Date(minTime).getFullYear();
  const endYear = new Date(maxTime).getFullYear();
  const yearSpan: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    yearSpan.push(y);
  }

  onProgress?.(1.0, 'Ready');

  return {
    summary: {
      totalPoints: points.length,
      totalVisits: visits.length,
      totalActivities: activities.length,
      totalDistanceKm: Math.round(totalDistanceKm),
      minTime,
      maxTime,
      countriesCount: Math.max(1, visitedCountries.size),
      citiesCount: Math.max(1, visitedCities.size),
      flightCount,
      yearSpan,
    },
    points,
    visits,
    activities,
    arcs,
    trips,
  };
}
