import { FunctionHandler } from "./types";

const functions: FunctionHandler[] = [];

functions.push({
  schema: {
    name: "get_weather_from_coords",
    type: "function",
    description: "Get the current weather",
    parameters: {
      type: "object",
      properties: {
        latitude: {
          type: "number",
        },
        longitude: {
          type: "number",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  handler: async (args: { latitude: number; longitude: number }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
    );
    const data = await response.json();
    const currentTemp = data.current?.temperature_2m;
    return JSON.stringify({ temp: currentTemp });
  },
});

// Add the get_weather function handler
functions.push({
  schema: {
    name: "get_weather",
    type: "function",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city name, e.g. Amsterdam, New York, etc.",
        },
      },
      required: ["location"],
    },
  },
  handler: async (args: { location: string }) => {
    try {
      // Using Open-Meteo Geocoding API to get coordinates
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(args.location)}&count=1`
      );
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        return JSON.stringify({
          location: args.location,
          error: "Location not found"
        });
      }
      
      const { latitude, longitude } = geoData.results[0];
      
      // Get weather using coordinates
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
      );
      const weatherData = await weatherResponse.json();
      
      // Map weather code to condition
      const weatherCodes: Record<number, string> = {
        0: "Clear sky",
        1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
      };
      
      const condition = weatherCodes[weatherData.current.weather_code] || "Unknown";
      
      return JSON.stringify({
        location: args.location,
        temperature: `${Math.round(weatherData.current.temperature_2m)}°C`,
        condition: condition,
        humidity: `${weatherData.current.relative_humidity_2m}%`,
        wind: `${weatherData.current.wind_speed_10m} km/h`
      });
    } catch (error) {
      console.error("Error getting weather data:", error);
      return JSON.stringify({
        location: args.location,
        error: "Failed to fetch weather data"
      });
    }
  },
});

export default functions;
