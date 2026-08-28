import { TimelineActivity, TimelineVisit, TripCluster, ActivityType } from '../types/timeline';
import { haversineDistanceKm, findNearestRegion } from './geoUtils';

/**
 * Clusters timeline activities and visits into discrete memorable trips and journeys
 */
export function clusterTrips(
  activities: TimelineActivity[],
  visits: TimelineVisit[]
): TripCluster[] {
  if (activities.length === 0 && visits.length === 0) return [];

  const trips: TripCluster[] = [];

  // Group 1: Detect explicit Flight journeys (high value trips)
  const flightActivities = activities.filter((a) => a.type === 'FLYING');
  for (let i = 0; i < flightActivities.length; i++) {
    const flight = flightActivities[i];
    const origin = findNearestRegion(flight.startLat, flight.startLng);
    const dest = findNearestRegion(flight.endLat, flight.endLng);
    const dist = flight.distanceMeters > 0
      ? flight.distanceMeters / 1000
      : haversineDistanceKm(flight.startLat, flight.startLng, flight.endLat, flight.endLng);

    trips.push({
      id: `flight-trip-${flight.id || i}`,
      title: `Flight: ${origin.name.split(',')[0]} ✈️ ${dest.name.split(',')[0]}`,
      subtitle: `${new Date(flight.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${Math.round(dist).toLocaleString()} km`,
      startDate: flight.startTime,
      endDate: flight.endTime,
      centerLat: (flight.startLat + flight.endLat) / 2,
      centerLng: (flight.startLng + flight.endLng) / 2,
      activitiesCount: 1,
      distanceKm: Math.round(dist),
      mainTransport: 'FLYING',
      pointsCount: (flight.pathPoints?.length || 0) + 2,
      flightCount: 1,
    });
  }

  // Group 2: Temporal & Geographical cluster windows (e.g. multi-day excursions or long roadtrips)
  const sortedActivities = [...activities].sort((a, b) => a.startTime - b.startTime);
  
  let currentGroup: TimelineActivity[] = [];
  const GAP_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours of inactivity or new journey

  for (const act of sortedActivities) {
    if (act.type === 'FLYING') continue; // Handled separately
    
    if (currentGroup.length === 0) {
      currentGroup.push(act);
    } else {
      const prev = currentGroup[currentGroup.length - 1];
      const timeDiff = act.startTime - prev.endTime;

      if (timeDiff < GAP_THRESHOLD_MS && currentGroup.length < 50) {
        currentGroup.push(act);
      } else {
        if (currentGroup.length >= 3) {
          const trip = createTripFromActivityGroup(currentGroup, `trip-cluster-${trips.length}`);
          if (trip && trip.distanceKm > 20) {
            trips.push(trip);
          }
        }
        currentGroup = [act];
      }
    }
  }

  if (currentGroup.length >= 3) {
    const trip = createTripFromActivityGroup(currentGroup, `trip-cluster-${trips.length}`);
    if (trip && trip.distanceKm > 20) {
      trips.push(trip);
    }
  }

  // Sort trips chronologically descending (newest first for selector)
  return trips.sort((a, b) => b.startDate - a.startDate);
}

function createTripFromActivityGroup(acts: TimelineActivity[], id: string): TripCluster | null {
  if (acts.length === 0) return null;

  const startAct = acts[0];
  const endAct = acts[acts.length - 1];

  let totalDistKm = 0;
  let centerLatSum = 0;
  let centerLngSum = 0;
  let totalPts = 0;

  const typeCounts: Record<string, number> = {};

  for (const a of acts) {
    const dist = a.distanceMeters > 0
      ? a.distanceMeters / 1000
      : haversineDistanceKm(a.startLat, a.startLng, a.endLat, a.endLng);
    totalDistKm += dist;
    centerLatSum += a.startLat + a.endLat;
    centerLngSum += a.startLng + a.endLng;
    totalPts += (a.pathPoints?.length || 0) + 2;

    typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
  }

  const primaryType = (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'IN_VEHICLE') as ActivityType;

  const centerLat = centerLatSum / (acts.length * 2);
  const centerLng = centerLngSum / (acts.length * 2);

  const startRegion = findNearestRegion(startAct.startLat, startAct.startLng);
  const endRegion = findNearestRegion(endAct.endLat, endAct.endLng);

  let title = '';
  if (startRegion.name === endRegion.name) {
    title = `Exploration in ${startRegion.name.split(',')[0]}`;
  } else {
    title = `${startRegion.name.split(',')[0]} ➔ ${endRegion.name.split(',')[0]}`;
  }

  const dateStr = new Date(startAct.startTime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    id,
    title,
    subtitle: `${dateStr} • ${Math.round(totalDistKm)} km • ${acts.length} segments`,
    startDate: startAct.startTime,
    endDate: endAct.endTime,
    centerLat,
    centerLng,
    activitiesCount: acts.length,
    distanceKm: Math.round(totalDistKm),
    mainTransport: primaryType,
    pointsCount: totalPts,
    flightCount: 0,
  };
}
