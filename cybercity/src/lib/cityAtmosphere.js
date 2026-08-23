// A single continuous parameter, derived from real overall resilience,
// driving every atmospheric effect in the dashboard's city view — fog,
// neon intensity, flicker, billboards, drone traffic, rain. Every value
// below is a smooth function of `clarity` (0 = fully degraded city, 1 =
// fully protected), never a hard on/off threshold, so the skyline is a
// real continuous status signal rather than decoration with a couple of
// discrete states. Tier 1 (CityGraphic.jsx) consumes fogOpacity/
// neonSaturation/neonBrightness/glowStrength/flickerChance/billboardOpacity;
// Tier 3 (CityDrones.jsx) consumes droneDensity/droneSmoothness; Tier 4
// (CityWeather.jsx) consumes rainIntensity — all computed here once so
// every tier stays visually consistent with the same underlying number.
export function computeCityAtmosphere(resilience) {
  const clarity = Math.max(0, Math.min(100, resilience)) / 100 // 0..1

  return {
    clarity,

    // Tier 1: fog/haze + neon intensity + flicker + billboards
    fogOpacity: 0.6 * (1 - clarity),
    skylineBlur: 1.6 * (1 - clarity), // px
    neonSaturation: 0.15 + clarity * 1.15,
    neonBrightness: 0.55 + clarity * 0.55,
    glowStrength: 1 + clarity * 7, // px
    flickerChance: 0.6 * (1 - clarity), // fraction of windows/billboards that flicker
    billboardOpacity: 0.25 + clarity * 0.75,

    // Tier 3: drone traffic — none at 0, up to maxDrones at 1; drones also
    // move on a jerkier per-drone timing curve as clarity drops.
    droneDensity: clarity,
    droneSmoothness: clarity,

    // Tier 4: rain clears up as resilience rises
    rainIntensity: 1 - clarity,
  }
}
