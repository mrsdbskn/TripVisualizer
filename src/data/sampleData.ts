import { TimelineDataset, TripArc, TimelineActivity, TimelineVisit, GPSPoint } from '../types/timeline';
import { interpolateGreatCircle } from '../services/geoUtils';

/**
 * Generates high-fidelity demo dataset with realistic world travels and city routes
 */
export function getSampleTimelineData(): TimelineDataset {
  const points: GPSPoint[] = [];
  const visits: TimelineVisit[] = [];
  const activities: TimelineActivity[] = [];
  const arcs: TripArc[] = [];

  const baseTime = new Date('2024-01-15T08:00:00Z').getTime();

  // 1. Flight: Zurich ➔ Tokyo
  const zrhTokStart = baseTime;
  const zrhTokEnd = baseTime + 13 * 3600 * 1000;
  arcs.push({
    id: 'arc-demo-1',
    startLat: 47.4582,
    startLng: 8.5555,
    endLat: 35.772,
    endLng: 140.3929,
    startTime: zrhTokStart,
    endTime: zrhTokEnd,
    type: 'FLYING',
    distanceKm: 9590,
    color: '#38bdf8',
    altitude: 0.45,
    label: 'Zurich ✈️ Tokyo (9,590 km)',
  });
  activities.push({
    id: 'act-demo-1',
    type: 'FLYING',
    startLat: 47.4582,
    startLng: 8.5555,
    endLat: 35.772,
    endLng: 140.3929,
    distanceMeters: 9590000,
    startTime: zrhTokStart,
    endTime: zrhTokEnd,
  });
  const flightPts1 = interpolateGreatCircle(47.4582, 8.5555, 35.772, 140.3929, 60);
  flightPts1.forEach((pt, idx) => {
    points.push({ lat: pt.lat, lng: pt.lng, time: zrhTokStart + idx * ((13 * 3600 * 1000) / 60) });
  });

  // Tokyo Visit
  visits.push({
    id: 'visit-demo-tokyo',
    name: 'Tokyo, Japan 🇯🇵',
    semanticType: 'HOTEL',
    lat: 35.6762,
    lng: 139.6503,
    startTime: zrhTokEnd,
    endTime: zrhTokEnd + 5 * 24 * 3600 * 1000,
    durationMinutes: 5 * 24 * 60,
  });

  // 2. Flight: Tokyo ➔ San Francisco
  const tokSfStart = zrhTokEnd + 6 * 24 * 3600 * 1000;
  const tokSfEnd = tokSfStart + 10 * 3600 * 1000;
  arcs.push({
    id: 'arc-demo-2',
    startLat: 35.772,
    startLng: 140.3929,
    endLat: 37.6213,
    endLng: -122.379,
    startTime: tokSfStart,
    endTime: tokSfEnd,
    type: 'FLYING',
    distanceKm: 8280,
    color: '#38bdf8',
    altitude: 0.42,
    label: 'Tokyo ✈️ San Francisco (8,280 km)',
  });
  activities.push({
    id: 'act-demo-2',
    type: 'FLYING',
    startLat: 35.772,
    startLng: 140.3929,
    endLat: 37.6213,
    endLng: -122.379,
    distanceMeters: 8280000,
    startTime: tokSfStart,
    endTime: tokSfEnd,
  });
  const flightPts2 = interpolateGreatCircle(35.772, 140.3929, 37.6213, -122.379, 50);
  flightPts2.forEach((pt, idx) => {
    points.push({ lat: pt.lat, lng: pt.lng, time: tokSfStart + idx * ((10 * 3600 * 1000) / 50) });
  });

  // 3. Flight: New York ➔ Zurich
  const nyZrhStart = tokSfEnd + 4 * 24 * 3600 * 1000;
  const nyZrhEnd = nyZrhStart + 8 * 3600 * 1000;
  arcs.push({
    id: 'arc-demo-3',
    startLat: 40.6413,
    startLng: -73.7781,
    endLat: 47.4582,
    endLng: 8.5555,
    startTime: nyZrhStart,
    endTime: nyZrhEnd,
    type: 'FLYING',
    distanceKm: 6320,
    color: '#38bdf8',
    altitude: 0.38,
    label: 'New York ✈️ Zurich (6,320 km)',
  });
  activities.push({
    id: 'act-demo-3',
    type: 'FLYING',
    startLat: 40.6413,
    startLng: -73.7781,
    endLat: 47.4582,
    endLng: 8.5555,
    distanceMeters: 6320000,
    startTime: nyZrhStart,
    endTime: nyZrhEnd,
  });

  // 4. European Trips: Zurich ➔ Milan ➔ Rome ➔ Paris ➔ London
  const euroTripStart = nyZrhEnd + 10 * 24 * 3600 * 1000;
  
  // Zurich to Milan (Train)
  arcs.push({
    id: 'arc-demo-4',
    startLat: 47.3769,
    startLng: 8.5417,
    endLat: 45.4642,
    endLng: 9.19,
    startTime: euroTripStart,
    endTime: euroTripStart + 4 * 3600 * 1000,
    type: 'IN_TRAIN',
    distanceKm: 280,
    color: '#a855f7',
    altitude: 0.1,
    label: 'Gotthard Express: Zurich 🚆 Milan (280 km)',
  });
  activities.push({
    id: 'act-demo-4',
    type: 'IN_TRAIN',
    startLat: 47.3769,
    startLng: 8.5417,
    endLat: 45.4642,
    endLng: 9.19,
    distanceMeters: 280000,
    startTime: euroTripStart,
    endTime: euroTripStart + 4 * 3600 * 1000,
  });

  // Milan to Rome (Frecciarossa)
  arcs.push({
    id: 'arc-demo-5',
    startLat: 45.4642,
    startLng: 9.19,
    endLat: 41.9028,
    endLng: 12.4964,
    startTime: euroTripStart + 2 * 24 * 3600 * 1000,
    endTime: euroTripStart + 2 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
    type: 'IN_TRAIN',
    distanceKm: 570,
    color: '#a855f7',
    altitude: 0.12,
    label: 'Frecciarossa: Milan 🚆 Rome (570 km)',
  });

  // Zurich to Paris (TGV)
  arcs.push({
    id: 'arc-demo-6',
    startLat: 47.3769,
    startLng: 8.5417,
    endLat: 48.8566,
    endLng: 2.3522,
    startTime: euroTripStart + 8 * 24 * 3600 * 1000,
    endTime: euroTripStart + 8 * 24 * 3600 * 1000 + 4 * 3600 * 1000,
    type: 'IN_TRAIN',
    distanceKm: 490,
    color: '#a855f7',
    altitude: 0.12,
    label: 'TGV Lyria: Zurich 🚆 Paris (490 km)',
  });

  // Paris to London (Eurostar)
  arcs.push({
    id: 'arc-demo-7',
    startLat: 48.8566,
    startLng: 2.3522,
    endLat: 51.5074,
    endLng: -0.1278,
    startTime: euroTripStart + 12 * 24 * 3600 * 1000,
    endTime: euroTripStart + 12 * 24 * 3600 * 1000 + 2.5 * 3600 * 1000,
    type: 'IN_TRAIN',
    distanceKm: 340,
    color: '#a855f7',
    altitude: 0.1,
    label: 'Eurostar: Paris 🚆 London (340 km)',
  });

  // Zurich to Antalya (Flight)
  const antalyaStart = euroTripStart + 20 * 24 * 3600 * 1000;
  arcs.push({
    id: 'arc-demo-8',
    startLat: 47.4582,
    startLng: 8.5555,
    endLat: 36.8969,
    endLng: 30.7133,
    startTime: antalyaStart,
    endTime: antalyaStart + 3.5 * 3600 * 1000,
    type: 'FLYING',
    distanceKm: 2180,
    color: '#38bdf8',
    altitude: 0.25,
    label: 'Zurich ✈️ Antalya (2,180 km)',
  });

  // Visits in European Cities
  const cities = [
    { name: 'Zurich, Switzerland', lat: 47.3769, lng: 8.5417, type: 'HOME' },
    { name: 'Milan, Italy', lat: 45.4642, lng: 9.19, type: 'VISIT' },
    { name: 'Rome, Italy', lat: 41.9028, lng: 12.4964, type: 'VISIT' },
    { name: 'Paris, France', lat: 48.8566, lng: 2.3522, type: 'VISIT' },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278, type: 'VISIT' },
    { name: 'Antalya, Turkey', lat: 36.8969, lng: 30.7133, type: 'HOTEL' },
    { name: 'New York, USA', lat: 40.7128, lng: -74.006, type: 'HOTEL' },
    { name: 'San Francisco, USA', lat: 37.7749, lng: -122.4194, type: 'HOTEL' },
    { name: 'Kyoto, Japan', lat: 35.0116, lng: 135.7681, type: 'VISIT' },
  ];

  cities.forEach((c, idx) => {
    visits.push({
      id: `visit-city-${idx}`,
      name: c.name,
      semanticType: c.type,
      lat: c.lat,
      lng: c.lng,
      startTime: baseTime + idx * 3 * 24 * 3600 * 1000,
      endTime: baseTime + idx * 3 * 24 * 3600 * 1000 + 48 * 3600 * 1000,
      durationMinutes: 48 * 60,
    });
    // Add point cluster around city
    for (let p = 0; p < 8; p++) {
      const offsetLat = (Math.random() - 0.5) * 0.08;
      const offsetLng = (Math.random() - 0.5) * 0.08;
      points.push({
        lat: c.lat + offsetLat,
        lng: c.lng + offsetLng,
        time: baseTime + idx * 3 * 24 * 3600 * 1000 + p * 1800 * 1000,
      });
    }
  });

  const trips = [
    {
      id: 'trip-asia-expedition',
      title: 'Transpacific Journey: Tokyo & Kyoto',
      subtitle: 'Jan 15–22, 2024 • 17,870 km • Flight + Shinkansen',
      startDate: zrhTokStart,
      endDate: tokSfStart,
      centerLat: 35.6762,
      centerLng: 139.6503,
      activitiesCount: 12,
      distanceKm: 17870,
      mainTransport: 'FLYING',
      pointsCount: 140,
      flightCount: 2,
    },
    {
      id: 'trip-us-coast',
      title: 'USA West to East: SF & NYC',
      subtitle: 'Jan 22–28, 2024 • 8,950 km • Pacific to Atlantic',
      startDate: tokSfStart,
      endDate: nyZrhEnd,
      centerLat: 39.19,
      centerLng: -98.2,
      activitiesCount: 8,
      distanceKm: 8950,
      mainTransport: 'FLYING',
      pointsCount: 95,
      flightCount: 2,
    },
    {
      id: 'trip-grand-europe',
      title: 'Grand European Rail Tour',
      subtitle: 'Feb 10–25, 2024 • 1,680 km • High-Speed Rail',
      startDate: euroTripStart,
      endDate: euroTripStart + 15 * 24 * 3600 * 1000,
      centerLat: 46.5,
      centerLng: 6.2,
      activitiesCount: 24,
      distanceKm: 1680,
      mainTransport: 'IN_TRAIN',
      pointsCount: 210,
      flightCount: 0,
    },
    {
      id: 'trip-mediterranean',
      title: 'Mediterranean Riviera & Turquoise Coast',
      subtitle: 'Mar 5–12, 2024 • 2,180 km • Antalya Coast',
      startDate: antalyaStart,
      endDate: antalyaStart + 7 * 24 * 3600 * 1000,
      centerLat: 36.89,
      centerLng: 30.71,
      activitiesCount: 9,
      distanceKm: 2180,
      mainTransport: 'FLYING',
      pointsCount: 88,
      flightCount: 1,
    },
  ];

  return {
    summary: {
      totalPoints: points.length,
      totalVisits: visits.length,
      totalActivities: activities.length,
      totalDistanceKm: 30680,
      minTime: zrhTokStart,
      maxTime: antalyaStart + 7 * 24 * 3600 * 1000,
      countriesCount: 7,
      citiesCount: 9,
      flightCount: 5,
      yearSpan: [2024],
    },
    points,
    visits,
    activities,
    arcs,
    trips,
  };
}
