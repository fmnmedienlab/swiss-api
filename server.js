import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(express.json());
app.use(cors());

// Proxy para Swiss Ephemeris
app.get("/planet", async (req, res) => {
  const { jd, planet } = req.query;

  if (!jd || !planet) {
    return res.status(400).json({ error: "Missing jd or planet" });
  }

  try {
    const response = await axios.get(
      "https://astrohub.click/swe/planet", // API externa com Swiss Ephemeris real
      { params: { jd, planet } }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Swiss API error", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Swiss API proxy running on port ${PORT}`));
