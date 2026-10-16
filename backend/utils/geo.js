const EARTH_RADIUS_M = 6371008.8;
const toRad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in metres between two lat/lng points (haversine). */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Round to ~110 m so public data never reveals an exact reporter position. */
const approx = (n, digits = 3) => Number(Number(n).toFixed(digits));

module.exports = { haversineMeters, approx };
