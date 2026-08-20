const MODE_KEYWORDS = {
  rain: ["rain", "raining", "drizzle", "downpour", "wet street", "under the rain", "lluvia", "lloviendo", "llovizna", "mojado", "bajo la lluvia"],
  night_city: ["night city", "city lights", "downtown", "streetlights", "late night", "midnight", "neon", "ciudad de noche", "luces de la ciudad", "medianoche", "noche"],
  street_racing: ["street race", "racing", "revving", "engine", "motorcycle", "motorbike", "highway", "speeding", "carrera", "carreras", "motores", "motocicleta", "autopista"],
  cafe: ["café", "cafe", "coffee shop", "espresso", "latte", "barista", "coffee", "cafetería", "cafeteria"],
  campus: ["campus", "university", "college", "lecture hall", "classroom", "dorm", "quad", "universidad", "facultad", "clase"],
  fireplace: ["fireplace", "fireplace crackle", "hearth", "firewood", "cabin fire", "chimenea", "fogata", "leña", "fuego"],
  home: ["living room", "bedroom", "at home", "home", "apartment", "house", "tv in the other room", "casa", "departamento", "living", "habitación", "televisión"],
  party: ["party", "club", "dance floor", "house party", "music through the wall", "crowd", "fiesta", "discoteca", "carrete", "música detrás de la pared"],
};

const MODE_LABELS = {
  rain: "Rain",
  night_city: "Night",
  street_racing: "Street racing",
  cafe: "Café",
  campus: "Campus",
  fireplace: "Fireplace",
  home: "Home · TV",
  party: "Party",
};

export function suggestAmbienceForScene(value = "") {
  const text = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  const scored = Object.entries(MODE_KEYWORDS).map(([mode, keywords]) => {
    let score = 0;
    const matches = [];
    for (const keyword of keywords) {
      if (!text.includes(keyword.toLowerCase())) continue;
      const weight = keyword.includes(" ") ? 3 : keyword.length >= 7 ? 2 : 1;
      score += weight;
      matches.push(keyword);
    }
    return { mode, score, matches };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || b.matches.length - a.matches.length);

  const best = scored[0];
  if (!best) return null;
  const runnerUp = scored[1];
  const confidence = best.score >= 5 ? "high" : best.score >= 3 ? "medium" : "low";
  if (confidence === "low" && runnerUp?.score === best.score) return null;

  return {
    mode: best.mode,
    label: MODE_LABELS[best.mode] || best.mode,
    confidence,
    reason: best.matches.slice(0, 2).join(" · "),
  };
}
