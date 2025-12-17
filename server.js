import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const STATE_FILE = "./state.json";
const SEGUNDOS_POR_REAL = 40;

// -------- estado --------
function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ tempo: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(STATE_FILE));
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// -------- recebe StreamElements --------
app.post("/streamelements", (req, res) => {
  console.log("📩 EVENTO RECEBIDO:", req.body);

  const valor = Number(req.body.amount || 0);
  const mensagem = (req.body.message || "").trim();

  if (valor <= 0) return res.sendStatus(200);

  const segundos = valor * SEGUNDOS_POR_REAL;
  const state = readState();

  if (mensagem.startsWith("-")) {
    state.tempo = Math.max(0, state.tempo - segundos);
    console.log(`⬇️ DIMINUIU ${segundos}s`);
  } else {
    state.tempo += segundos;
    console.log(`⬆️ AUMENTOU ${segundos}s`);
  }

  writeState(state);
  res.sendStatus(200);
});

// -------- overlay --------
app.get("/tempo", (req, res) => {
  const state = readState();
  res.json({ tempo: state.tempo });
});

// -------- contador --------
setInterval(() => {
  const state = readState();
  if (state.tempo > 0) {
    state.tempo -= 1;
    writeState(state);
  }
}, 1000);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
