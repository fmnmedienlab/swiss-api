import express from "express";
import swisseph from "swisseph";

const app = express();
app.use(express.json());

swisseph.swe_set_ephe_path("/usr/share/ephe");

app.get("/planet", (req, res) => {
  const { jd, planet } = req.query;
  if (!jd || !planet) return res.status(400).send("Missing jd or planet");

  swisseph.swe_calc(+jd, +planet, (result) => {
    res.json(result);
  });
});

app.listen(3000, () => console.log("Swiss API running on port 3000"));
