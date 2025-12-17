import express from "express";
import fs from "fs";
import WebSocket from "ws";

const app = express();
app.use(express.json());

// ========================
// CONFIG
// ========================
const PORT = process.env.PORT || 3000;
const STATE_FILE = "./state.json";
const SEGUNDOS_POR_REAL = 40;

// 👉 COLE AQUI SEU TOKEN JWT DO STREAMELEMENTS
const SE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjaXRhZGVsIiwiZXhwIjoxNzgxNDY1ODg0LCJqdGkiOiJiZWM3ZGEzYy0yYzZkLTRkMjAtOTY0ZC1kZTA4ZjdiNjM5ZjYiLCJjaGFubmVsIjoiNjJkNmI3MGM1NWE5YjhiYTljMzcxNDgzIiwicm9sZSI6Im93bmVyIiwiYXV0aFRva2VuIjoiNWdBZktjU3lhbmF6bkxZWGlsblBXVGoySlNZa2lIZXpJT1plLXB1bVR2RTd4V21BIiwidXNlciI6IjYyZDZiNzBjNTVhOWI4YTJlMzM3MTQ4MiIsInVzZXJfaWQiOiJjZDMzYmM1OC05ODQ5LTRmNDktYjk1Yy0wODE0Y2Q4YzE4ZWUiLCJ1c2VyX3JvbGUiOiJjcmVhdG9yIiwicHJvdmlkZXIiOiJ5b3V0dWJlIiwicHJvdmlkZXJfaWQiOiJVQzVDTW5qdU1FUUxpSjluVGRaN2N6T2ciLCJjaGFubmVsX2lkIjoiMTQ0YjlhOGUtNWMwZi00ZTRhLWIxNGItMWNmM2YzMjQzNzg3IiwiY3JlYXRvcl9pZCI6Ijk0NGExZTliLTRhN2YtNDdjMi04ZjBiLTUyNjZlZDU2MTZmMSJ9.ZBAeZ0njCL8Wvais5KY2b8ZHfIz_q-ptiHXL31i4raY";

// ========================
// ESTADO
// ========================
function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ tempo: 0 }, null, 2)
    );
  }
  return JSON.parse(fs.readFileSync(STATE_FILE));
}

function writeState(state) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(state, null, 2)
  );
}

// ========================
// OVERLAY (OBS)
// ========================
app.get("/tempo", (req, res) => {
  const state = readState();
  res.json({ tempo: state.tempo });
});

// ========================
// STREAMELEMENTS WEBSOCKET
// ========================
const ws = new WebSocket(
  "wss://realtime.streamelements.com/socket.io/?EIO=3&transport=websocket"
);

ws.on("open", () => {
  console.log("🟢 Conectado ao StreamElements");

  ws.send(
    `42["authenticate",{"method":"jwt","token":"${SE_TOKEN}"}]`
  );
});

ws.on("message", (data) => {
  const msg = data.toString();

  // Só mensagens de evento
  if (!msg.startsWith('42["event"')) return;

  const parsed = JSON.parse(msg.slice(2));
  const event = parsed[1];

  console.log("📩 Evento recebido:", event.type);

  // 👉 SOMENTE DOAÇÃO REAL (TIP)
  if (event.type !== "tip") {
    console.log("⚠️ Ignorado (não é tip)");
    return;
  }

  const valor = Math.floor(event.data.amount || 0);
  const mensagem = event.data.message || "";

  if (valor <= 0) {
    console.log("❌ Tip sem valor monetário");
    return;
  }

  const segundos = valor * SEGUNDOS_POR_REAL;

  const state = readState();
  state.tempo += segundos;
  writeState(state);

  console.log("💰 DOAÇÃO RECEBIDA");
  console.log(`   Valor: R$${valor}`);
  console.log(`   Mensagem: ${mensagem}`);
  console.log(`   ⏱️ +${segundos}s`);
});

// ========================
// CONTADOR REGRESSIVO
// ========================
setInterval(() => {
  const state = readState();

  if (state.tempo > 0) {
    state.tempo -= 1;
    writeState(state);
  }
}, 1000);

// ========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
