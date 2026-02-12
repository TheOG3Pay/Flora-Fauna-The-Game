
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

/**
 * In-memory rooms:
 * roomId: {
 *   createdAt,
 *   facilitatorSocketId,
 *   phaseIndex,
 *   phaseStartedAt,
 *   teams: { roleKey: { name, socketId, connected } },
 *   submissions: { roleKey: { type, payload, ts } },
 *   log: [{ts, tag, msg}],
 *   score, risk,
 *   deck: [indices],
 *   drawn: []
 * }
 */
const ROLES = ["G&O", "Ecoresult", "IkWilNietMeewerken", "Beunhaas"];
const rooms = new Map();

function now() { return new Date().toISOString(); }
function randRoom(){
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for(let i=0;i<5;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}

const PHASES = [
  { id: "intro", title: "Intro", durationSec: 60,
    prompt: "Welkom bij Operatie Oude Eik. Kies je team/rol en wacht tot de facilitator start.",
    input: null
  },
  { id: "scope", title: "Ronde 1 – Scope (wat gaan we doen?)", durationSec: 180,
    prompt: "G&O: kies een scope-richting. Ecoresult: stel 3 must-know vragen. Bevoegd gezag: geef 1 ‘eis’. Aannemer: benoem je startvoorwaarde.",
    input: { type: "multi" }
  },
  { id: "complication", title: "Ronde 2 – Complicatie", durationSec: 120,
    prompt: "Facilitator trekt een complicatiekaart. Elk team reageert in 1 zin: wat is jouw zorg/actie?",
    input: { type: "text" }
  },
  { id: "choice", title: "Ronde 3 – Strategische keuze", durationSec: 150,
    prompt: "Iedereen stemt: A (nu quickscan), B (eerst uitwerken), C (alles tegelijk).",
    input: { type: "vote", options: ["A","B","C"] }
  },
  { id: "reality", title: "Ronde 4 – Realiteit check", durationSec: 120,
    prompt: "Feiten: seizoenen + vergunning 9–12 mnd + gewenning. Teams: noem 2 acties die je vandaag regelt om over 3 jaar te starten.",
    input: { type: "text" }
  },
  { id: "wrap", title: "Afronding", durationSec: 90,
    prompt: "Nabespreking: 3 lessen. (Iedereen typt 1 les.)",
    input: { type: "text" }
  }
];

const COMPLICATIONS = [
  { icon:"🦇", title:"Vleermuizen gemeld", text:"Bewoners melden ‘veel vleermuizen’ bij de dakrand. Media-aandacht.", risk:+2, score:-1 },
  { icon:"🧓", title:"Toegang geweigerd", text:"Bewoners weigeren onderzoek in woningen (‘privacy’).", risk:+2, score:-1 },
  { icon:"🌧️", title:"Spoed dakreparatie", text:"Stormschade: lekkage. Noodmaatregel binnen 2 weken.", risk:+3, score:0 },
  { icon:"📉", title:"Budget -20%", text:"Budget gekort, scope blijft gelijk.", risk:+1, score:-2 },
  { icon:"🪹", title:"Gierzwaluwen actief", text:"In mei nestactiviteit waargenomen.", risk:+2, score:-1 },
  { icon:"🏗️", title:"Scope groeit", text:"Toch gevel + kozijnen + dak in één keer.", risk:+2, score:-2 },
  { icon:"📣", title:"Bewonersavond escaleert", text:"Politieke aandacht; bewoners eisen duidelijkheid.", risk:+1, score:-1 },
  { icon:"🗂️", title:"Dossier incompleet", text:"Oude rapporten zoek. Nieuwe bronnenanalyse nodig.", risk:+1, score:-1 },
];

function newRoom(){
  const id = randRoom();
  // create shuffled deck indices
  const deck = Array.from({length: COMPLICATIONS.length}, (_,i)=>i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const room = {
    createdAt: now(),
    facilitatorSocketId: null,
    phaseIndex: 0,
    phaseStartedAt: null,
    teams: {}, // roleKey -> team info
    submissions: {},
    log: [],
    score: 0,
    risk: 0,
    deck,
    drawn: [],
    currentComplication: null
  };
  rooms.set(id, room);
  return id;
}

function roomState(roomId){
  const room = rooms.get(roomId);
  if(!room) return null;
  const phase = PHASES[room.phaseIndex] || PHASES[PHASES.length-1];
  return {
    roomId,
    createdAt: room.createdAt,
    phaseIndex: room.phaseIndex,
    phase,
    phaseStartedAt: room.phaseStartedAt,
    teams: room.teams,
    submissions: room.submissions,
    log: room.log.slice(-30),
    score: room.score,
    risk: room.risk,
    currentComplication: room.currentComplication
  };
}

function emitRoom(roomId){
  io.to(roomId).emit("room_state", roomState(roomId));
}

function log(room, tag, msg){
  room.log.push({ ts: now(), tag, msg });
  if(room.log.length > 300) room.log.shift();
}

function allRolesConnected(room){
  return ROLES.every(r => room.teams[r] && room.teams[r].connected);
}

function allSubmitted(room){
  return ROLES.every(r => room.submissions[r]);
}

function clearSubmissions(room){
  room.submissions = {};
}

function applyVoteConsequences(room){
  // tally votes
  const counts = {A:0,B:0,C:0};
  for(const r of ROLES){
    const sub = room.submissions[r];
    if(sub && sub.type==="vote" && counts[sub.payload] !== undefined) counts[sub.payload]++;
  }
  const winner = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  // consequences (simple, teachy)
  if(winner==="A"){ room.score += 2; room.risk += 2; log(room,"Gevolg","Meerderheid kiest A (nu quickscan): sneller inzicht, maar risico op ‘worst-case’ als scope vaag is."); }
  if(winner==="B"){ room.score += 3; room.risk += 1; log(room,"Gevolg","Meerderheid kiest B (eerst uitwerken): betere info, minder worst-case; wel planning strak houden."); }
  if(winner==="C"){ room.score -= 1; room.risk += 4; log(room,"Gevolg","Meerderheid kiest C (alles tegelijk): chaos/overlap → hogere risico’s en extra vragen."); }
  log(room,"Stemuitslag",`A:${counts.A} B:${counts.B} C:${counts.C} → gekozen: ${winner}`);
}

io.on("connection", (socket) => {
  socket.on("create_room", () => {
    const roomId = newRoom();
    socket.emit("room_created", { roomId });
  });

  socket.on("join_room", ({ roomId, asFacilitator }) => {
    const room = rooms.get(roomId);
    if(!room) return socket.emit("error_msg", "Room bestaat niet (check code).");
    socket.join(roomId);

    if(asFacilitator){
      room.facilitatorSocketId = socket.id;
      log(room, "Facilitator", "Facilitator is verbonden.");
      socket.emit("joined", { roomId, role: "Facilitator" });
      emitRoom(roomId);
      return;
    }
    socket.emit("joined", { roomId, role: "Spectator" });
    emitRoom(roomId);
  });

  socket.on("claim_role", ({ roomId, roleKey, teamName }) => {
    const room = rooms.get(roomId);
    if(!room) return socket.emit("error_msg", "Room bestaat niet.");
    if(!ROLES.includes(roleKey)) return socket.emit("error_msg", "Onbekende rol.");
    // if already claimed by connected socket, deny
    const existing = room.teams[roleKey];
    if(existing && existing.connected && existing.socketId !== socket.id){
      return socket.emit("error_msg", "Deze rol is al bezet.");
    }
    room.teams[roleKey] = { name: teamName || roleKey, socketId: socket.id, connected: true };
    log(room, "Team", `${roleKey} is bezet door '${room.teams[roleKey].name}'.`);
    emitRoom(roomId);
  });

  socket.on("start_phase", ({ roomId }) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.facilitatorSocketId !== socket.id) return;
    room.phaseStartedAt = now();
    clearSubmissions(room);
    room.currentComplication = null;
    log(room, "Fase", `Start: ${PHASES[room.phaseIndex].title}`);
    emitRoom(roomId);
  });

  socket.on("next_phase", ({ roomId }) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.facilitatorSocketId !== socket.id) return;

    // apply consequences at end of vote phase
    const current = PHASES[room.phaseIndex];
    if(current && current.id === "choice"){
      applyVoteConsequences(room);
    }

    room.phaseIndex = Math.min(PHASES.length-1, room.phaseIndex + 1);
    room.phaseStartedAt = now();
    clearSubmissions(room);
    room.currentComplication = null;
    log(room, "Fase", `Volgende: ${PHASES[room.phaseIndex].title}`);
    emitRoom(roomId);
  });

  socket.on("draw_complication", ({ roomId }) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.facilitatorSocketId !== socket.id) return;

    if(room.deck.length === 0){
      room.deck = Array.from({length: COMPLICATIONS.length}, (_,i)=>i);
    }
    const idx = room.deck.pop();
    room.drawn.push(idx);
    const c = COMPLICATIONS[idx];
    room.currentComplication = c;
    room.score += c.score;
    room.risk += c.risk;
    log(room, "Complicatie", `${c.icon} ${c.title}: ${c.text}`);
    emitRoom(roomId);
  });

  socket.on("submit", ({ roomId, roleKey, type, payload }) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(!ROLES.includes(roleKey)) return;
    // accept only from the socket that claimed role
    if(!room.teams[roleKey] || room.teams[roleKey].socketId !== socket.id){
      return socket.emit("error_msg", "Je hebt deze rol niet geclaimd.");
    }
    room.submissions[roleKey] = { type, payload, ts: now() };
    log(room, "Inzending", `${roleKey}: ${type === "vote" ? "stemde " + payload : "diende antwoord in"}.`);
    emitRoom(roomId);
  });

  socket.on("reset_room", ({ roomId }) => {
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.facilitatorSocketId !== socket.id) return;
    room.phaseIndex = 0;
    room.phaseStartedAt = now();
    room.score = 0;
    room.risk = 0;
    room.submissions = {};
    room.log = [];
    room.currentComplication = null;
    log(room, "Reset", "Room is gereset.");
    emitRoom(roomId);
  });

  socket.on("disconnect", () => {
    // mark role disconnected if any
    for(const [roomId, room] of rooms.entries()){
      for(const roleKey of ROLES){
        const t = room.teams[roleKey];
        if(t && t.socketId === socket.id){
          t.connected = false;
          log(room, "Team", `${roleKey} is offline.`);
          emitRoom(roomId);
        }
      }
      if(room.facilitatorSocketId === socket.id){
        room.facilitatorSocketId = null;
        log(room, "Facilitator", "Facilitator is offline.");
        emitRoom(roomId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Operatie Oude Eik server running on http://localhost:${PORT}`);
});
