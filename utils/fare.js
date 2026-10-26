
function calculateFare(distance, duration) {
  const baseFare = 30;
  const perKm = 12;
  const perMinute = 2;
  const minimumFare = 50;

  let surge = Number(process.env.SURGE_MULTIPLIER || 1);

  if (!Number.isFinite(surge) || surge < 1) {
    surge = 1;
  }

  const normalFare =
    baseFare + distance * perKm + duration * perMinute;

  const estimatedFare = Math.max(
    minimumFare,
    normalFare * surge
  );

  return {
    baseFare,
    distanceCharge: Number((distance * perKm).toFixed(2)),
    timeCharge: Number((duration * perMinute).toFixed(2)),
    surgeMultiplier: surge,
    estimatedFare: Number(estimatedFare.toFixed(2))
  };
}

module.exports = calculateFare;
