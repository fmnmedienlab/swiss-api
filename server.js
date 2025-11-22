import express from "express";
import cors from "cors";
import SwissEPH from "sweph-wasm";

const app = express();
app.use(cors());
app.use(express.json());

let swe = null;

// ---------- INICIALIZAÇÃO SWISS EPHEMERIS ----------
(async () => {
  try {
    // Carrega o módulo WASM
    swe = await SwissEPH.init();

    // Usa o CDN oficial de efemérides do próprio sweph-wasm
    await swe.swe_set_ephe_path();

    console.log("✅ Swiss Ephemeris (WASM) carregado com sucesso.");
  } catch (err) {
    console.error("❌ Erro a inicializar Swiss Ephemeris:", err);
    // Se falhar, é melhor nem arrancar o servidor
    process.exit(1);
  }
})();

// Pequeno helper para garantir que o módulo já está pronto
function ensureReady(res) {
  if (!swe) {
    res.status(503).json({ error: "Swiss Ephemeris ainda a iniciar, tenta de novo em 1–2 segundos." });
    return false;
  }
  return true;
}

// ---------- ENDPOINT DE TESTE ----------
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Swiss API online" });
});

// ---------- PLANETAS COM 100% PRECISÃO ----------
app.get("/planet", (req, res) => {
  if (!ensureReady(res)) return;

  const jd = parseFloat(req.query.jd);
  const planet = parseInt(req.query.planet, 10); // 0=Sol, 1=Lua, 2=Mercúrio, etc.

  if (Number.isNaN(jd) || Number.isNaN(planet)) {
    return res.status(400).json({ error: "Parâmetros jd e planet são obrigatórios." });
  }

  try {
    // Flags: Swiss Ephemeris + velocidade
    const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

    // [lon, lat, dist, lonSpeed, latSpeed, distSpeed]
    const result = swe.swe_calc_ut(jd, planet, flags);

    res.json({
      jd,
      planet,
      longitude: result[0],
      latitude: result[1],
      distance: result[2],
      speedLongitude: result[3],
      speedLatitude: result[4],
      speedDistance: result[5]
    });
  } catch (err) {
    console.error("Erro em /planet:", err);
    res.status(500).json({ error: "Erro Swiss Ephemeris", details: String(err.message || err) });
  }
});

// ---------- CASAS (PLACIDUS REAL) ----------
app.get("/houses", (req, res) => {
  if (!ensureReady(res)) return;

  const jd = parseFloat(req.query.jd);
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if ([jd, lat, lon].some((v) => Number.isNaN(v))) {
    return res.status(400).json({ error: "Parâmetros jd, lat, lon são obrigatórios." });
  }

  try {
    // "P" = Placidus (como pediste)
    const houses = swe.swe_houses(jd, lat, lon, "P");

    res.json({
      jd,
      latitude: lat,
      longitude: lon,
      system: "Placidus",
      cusps: houses.cusps,     // 12 casas
      asc: houses.ascmc[0],    // Ascendente
      mc: houses.ascmc[1]      // Meio-do-Céu
    });
  } catch (err) {
    console.error("Erro em /houses:", err);
    res.status(500).json({ error: "Erro Swiss Ephemeris (casas)", details: String(err.message || err) });
  }
});

// ---------- ARRANCAR SERVIDOR ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Swiss API a correr na porta ${PORT}`);
});
