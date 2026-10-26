const axios = require("axios");

async function getRoute(pickup, dropoff) {
  if (!process.env.MAPBOX_TOKEN) {
    throw new Error("Mapbox token is not configured");
  }

  const start = pickup.join(",");
  const end = dropoff.join(",");

  const url =`https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}`;

  const response = await axios.get(url, {
    params: {
      access_token: process.env.MAPBOX_TOKEN,
      overview: "full",
      geometries: "geojson",
      radiuses: "100;100"
    }
  });

if (
  !response.data.routes ||
  response.data.routes.length === 0
) {
  console.log("Mapbox response:", response.data);
  throw new Error("No route found");
}

  const route = response.data.routes[0];

  return {
    distance: route.distance / 1000,
    duration: route.duration / 60,
    geometry: route.geometry
  };
}

module.exports = getRoute;

