import { useState, useEffect } from "react";

const weatherCodeToInfo = (code) => {
  if (code === 0) return { description: "Céu limpo", icon: "☀️" };
  if (code <= 3) return { description: "Parcialmente nublado", icon: "⛅" };
  if (code <= 48) return { description: "Nublado", icon: "☁️" };
  if (code <= 57) return { description: "Garoa", icon: "🌦️" };
  if (code <= 67) return { description: "Chuva", icon: "🌧️" };
  if (code <= 77) return { description: "Neve", icon: "❄️" };
  if (code <= 82) return { description: "Pancadas de chuva", icon: "🌧️" };
  if (code <= 99) return { description: "Tempestade", icon: "⛈️" };
  return { description: "Indefinido", icon: "🌤️" };
};

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        // Reverse geocode for city name
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`);
        const geoData = await geoRes.json();
        const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Sua região";

        // Weather from Open-Meteo
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
        const weatherData = await weatherRes.json();

        const temp = Math.round(weatherData.current.temperature_2m);
        const info = weatherCodeToInfo(weatherData.current.weather_code);

        setWeather({ temperature: temp, city, ...info });
      } catch (e) {
        setWeather({ temperature: 28, city: "Sua região", description: "Céu limpo", icon: "☀️" });
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Fallback: São Leopoldo
          fetchWeather(-29.7604, -51.1480);
        },
        { timeout: 5000, maximumAge: 600000 }
      );
    } else {
      fetchWeather(-29.7604, -51.1480);
    }
  }, []);

  return { weather, loading };
}
