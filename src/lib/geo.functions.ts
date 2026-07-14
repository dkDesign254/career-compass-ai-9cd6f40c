import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

// Vercel automatically sets x-vercel-ip-country on every request in production,
// no external geo-IP API or key needed. Locally (or on other hosts) this is
// undefined and the client falls back to its own best guess / manual choice.
export const getGeoCountry = createServerFn({ method: "GET" }).handler(async () => {
  const country = getRequestHeader("x-vercel-ip-country") ?? null;
  const city = getRequestHeader("x-vercel-ip-city") ?? null;
  return { country, city: city ? decodeURIComponent(city) : null };
});
