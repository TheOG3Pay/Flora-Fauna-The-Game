
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json({ limit: "2mb" }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
app.get("/facilitator", (req,res)=> res.sendFile(path.join(__dirname,"public","facilitator.html")));

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Minimal config endpoint for UI
app.get("/api/config", (req,res)=>{
  res.json({ hasOpenAIKey: Boolean(OPENAI_API_KEY) });
});

/* ----------------------- Game Core ----------------------- */
const ROLES = ["G&O", "Ecoresult", "IkWilNietMeewerken", "Beunhaas"];

function now() { return new Date().toISOString(); }
function randCode(){
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for(let i=0;i<5;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function createScenario(seed){
  const buildings = [
    {label:"Oud stadsblok (1952)", type:"portiekflat", units:120},
    {label:"Vooroorlogs pand (1934)", type:"galerij", units:68},
    {label:"Jaren-70 complex (1976)", type:"portiekflat", units:96},
    {label:"Monumentaal pand (1890)", type:"herbestemming", units:34},
  ];
  const locations = ["bosrand", "dorpskern", "binnenstad", "waterkant"];
  const scopes = [
    "gevelisolatie + kozijnen",
    "dakrenovatie + zonnepanelen",
    "spouwmuurisolatie + ventilatie",
    "dak + gevel + installaties (integrale verduurzaming)"
  ];
  const speciesRisks = [
    {key:"vleermuizen", label:"(vermoeden) spouwvleermuizen"},
    {key:"huismussen", label:"huismussen (nestlocaties in dakrand)"},
    {key:"gierzwaluwen", label:"gierzwaluwen (nestkasten aanwezig)"},
    {key:"onzeker", label:"onbekend – veel groen, indicaties van soorten"}
  ];
  const constraints = [
    "Bewoners zijn onrustig over overlast.",
    "Er is politieke druk om tempo te maken.",
    "Budget is krap door andere projecten.",
    "De aannemer heeft capaciteit gereserveerd in Q2.",
    "Bevoegd gezag heeft beperkte capaciteit (lange doorlooptijd)."
  ];
  return {
    building: pick(buildings),
    location: pick(locations),
    scope: pick(scopes),
    risk: pick(speciesRisks),
    constraint: pick(constraints),
    smp: pick([
      "SMP in ontwikkeling (mogelijk 2027). Niet zeker: plan regulier als basis.",
      "SMP onzeker: je kunt er niet op leunen, alleen monitoren.",
      "SMP komt eraan, maar bevoegd gezag is nog streng op volledigheid."
    ])
  };
}

function imagePromptForRound(roundId, sc){
  const base = `Realistic Dutch housing complex, ${sc.location}, ${sc.building.label}, architectural documentary style, natural lighting`;
  if(roundId==="scope") return `${base}, wide aerial shot showing building and lots of green around, planning context, no text`;
  if(roundId==="finding") return `Close-up documentary photo of wildlife signs near roof edge / cavity wall in Dutch brick building, realistic, no text`;
  if(roundId==="permit") return `Municipal office desk scene with documents and laptop, Dutch context, realistic, no readable text`;
  if(roundId==="execution") return `Construction site at Dutch apartment building with scaffolding, workers waiting, realistic, no logos, no text`;
  return base;
}

// Base round templates (fallback). AI-mode can override per room/round.
const BASE_ROUNDS = [
  {
    id:"scope",
    title:"Ronde 1 – Scope & onzekerheden",
    prompt:(sc)=>`Project: ${sc.building.label} (${sc.building.units} woningen) aan ${sc.location}. Voorgenomen: ${sc.scope}. Ecologisch risico: ${sc.risk.label}. ${sc.constraint}`,
    options:{
      "G&O":[["A","Voorlopige scope + onzekerhedenlijst","‘80%-scope’ + wat nog onbekend is."],["B","Scope open (‘onderzoek maar breed’)","Worst-case laten verkennen."],["C","Scope minimaliseren","Beperkte werkzaamheden communiceren."]],
      "Ecoresult":[["A","Worst-case quickscan","Breed onderzoek (duur/lang)."],["B","Gefaseerd: inspectie → gericht","Toegang + seizoensplanning."],["C","Wachten op scope","Start later, dossier ‘schoon’."]],
      "IkWilNietMeewerken":[["A","Eist volledigheid vooraf","Onvolledig tenzij scope concreet."],["B","Denkt mee, vraagt planning","Vensters + alternatieven."],["C","Extra eisen dataverzameling","Foto’s/tekeningen verplicht."]],
      "Beunhaas":[["A","Startdatum vastleggen","Harde datum + toegang."],["B","Meewerken mits duidelijkheid","Go/no-go moment."],["C","Capaciteit verplaatsen","Niet rond? dan schuift het."]],
    }
  },
  {
    id:"finding",
    title:"Ronde 2 – Vondst / bewonersmelding",
    prompt:(sc)=>`Bewoners melden activiteit rond dakrand/spouw (mogelijk ${sc.risk.key}). Tegelijk vraagt Service om spoedreparatie (lekkage). Wat doen jullie?`,
    options:{
      "G&O":[["A","Spoedmaatregel + stop op verstorend werk","Noodreparatie, ecologisch veilig."],["B","Doorpakken (planning leidend)","Druk op snelle start."],["C","Communicatie eerst","Bewonersbrief + toegang regelen."]],
      "Ecoresult":[["A","Direct aanvullend onderzoek","Venster + toegang + log meldingen."],["B","Mitigatie alvast voorbereiden","Kasten/voorzieningen klaar."],["C","Eerst feiten verzamelen","Snelle inspectie."]],
      "IkWilNietMeewerken":[["A","Onderzoek verplicht","Zonder onderzoek geen verstoring."],["B","Spoed toe onder voorwaarden","Minimale ingreep + toezicht."],["C","Extra alternatievenonderbouwing","Eerst papier, dan actie."]],
      "Beunhaas":[["A","Wacht op Ecoresult","Geen werk zonder groen licht."],["B","Alleen noodreparatie","Afgebakend en snel."],["C","Start met voorbereiding","Steiger/voorbereiding (risico)."]],
    }
  },
  {
    id:"permit",
    title:"Ronde 3 – Vergunningsdossier",
    prompt:(sc)=>`Dossieropbouw. Bevoegd gezag waarschuwt: behandeltijd 9–12 maanden en vaak ‘aanvullingen’. ${sc.smp}`,
    options:{
      "G&O":[["A","Proactief compleet maken","Alternatieven, planning, tekeningen."],["B","Snel indienen + later aanvullen","Winst, maar kans op vragen."],["C","Wachten op SMP doorbraak","Hoopt op vereenvoudiging."]],
      "Ecoresult":[["A","Alleen indienen als compleet","Minder terugkoppeling."],["B","Indienen met fasering + vooroverleg","Balans."],["C","Innovatie als onderbouwing","Meer data, kan vragen oproepen."]],
      "IkWilNietMeewerken":[["A","Strikte toetsing","Aanvullingen waarschijnlijk."],["B","Vooroverleg mogelijk","Scheelt later."],["C","Focus alternatieven/mitigatie","Strenge bewijslast."]],
      "Beunhaas":[["A","Wachttijd ok met planning","Wel vastleggen."],["B","Parallel voorbereiden","Bij laag risico."],["C","Heronderhandeling","Onzekerheid + inflatie."]],
    }
  },
  {
    id:"execution",
    title:"Ronde 4 – Startbeslissing (over 3 jaar)",
    prompt:(sc)=>`Startdatum nadert. Tegenslag: bewoners weigeren toegang in 1 portiek. Wat nu?`,
    options:{
      "G&O":[["A","Segmenteren: starten waar kan","Fasering voorkomt totale vertraging."],["B","Pauze tot 100% toegang","Veilig, maar vertraagt."],["C","Escaleren (juridisch)","Toegang afdwingen (reputatie)."]],
      "Ecoresult":[["A","Werkprotocol + toezicht","Borging ecologische veiligheid."],["B","Extra onderzoek/mitigatie","Risico omlaag, tijd omhoog."],["C","Niet-verstorende maatregelen eerst","Veilige acties stapelen."]],
      "IkWilNietMeewerken":[["A","Groen licht met voorwaarden","Toezicht/vensters/rapportage."],["B","Eerst aantoonbare toegang","Zonder toegang geen start."],["C","Extra monitoring verplicht","Monitoring seizoen/winter."]],
      "Beunhaas":[["A","Gefaseerd starten","Strakke coördinatie."],["B","1 startmoment","Anders duurder."],["C","Extra stelpost onvoorzien","Voor vertraging/risico."]],
    }
  }
];

function evaluateRound(choiceMap){
  let deltaScore = 0, deltaRisk = 0;
  const trust = { "G&O":0, "Ecoresult":0, "IkWilNietMeewerken":0, "Beunhaas":0 };
  const go = choiceMap["G&O"], eco = choiceMap["Ecoresult"], gov = choiceMap["IkWilNietMeewerken"], con = choiceMap["Beunhaas"];

  const addAll = (t)=>{ for(const k of Object.keys(trust)) trust[k]+=t; };

  if(go==="A"){ deltaScore+=2; trust["Ecoresult"]+=1; trust["IkWilNietMeewerken"]+=1; }
  if(go==="B"){ deltaRisk+=2; deltaScore-=1; trust["Ecoresult"]-=2; trust["IkWilNietMeewerken"]-=1; }
  if(go==="C"){ deltaRisk+=3; deltaScore-=2; trust["Ecoresult"]-=2; trust["IkWilNietMeewerken"]-=2; }

  if(eco==="A"){ deltaRisk+=1; deltaScore-=1; trust["G&O"]-=1; }
  if(eco==="B"){ deltaScore+=2; trust["G&O"]+=1; trust["IkWilNietMeewerken"]+=1; }
  if(eco==="C"){ deltaRisk+=1; deltaScore-=1; trust["G&O"]-=1; trust["Beunhaas"]-=1; }

  if(gov==="A"){ deltaRisk-=1; deltaScore-=1; trust["G&O"]-=1; trust["Beunhaas"]-=1; }
  if(gov==="B"){ deltaScore+=1; trust["Ecoresult"]+=1; }
  if(gov==="C"){ deltaRisk+=1; deltaScore-=1; trust["G&O"]-=1; }

  if(con==="A"){ deltaScore+=1; trust["Ecoresult"]+=1; }
  if(con==="B"){ deltaScore+=1; trust["G&O"]+=1; }
  if(con==="C"){ deltaRisk+=1; deltaScore-=1; trust["G&O"]-=1; }

  if((go==="B"||go==="C") && eco==="A"){ deltaRisk+=2; deltaScore-=2; trust["G&O"]-=1; trust["Ecoresult"]-=1; }
  if(gov==="A" && go==="C"){ deltaRisk+=2; deltaScore-=2; trust["IkWilNietMeewerken"]-=1; trust["G&O"]-=1; }
  if(con==="C" && gov==="A"){ deltaRisk+=2; deltaScore-=1; trust["Beunhaas"]-=2; }
  if(go==="A" && eco==="B" && gov==="B" && (con==="B"||con==="A")){ deltaScore+=2; deltaRisk-=1; addAll(1); }

  for(const k of Object.keys(trust)){
    trust[k] = Math.max(-5, Math.min(5, trust[k]));
  }
  return { deltaScore, deltaRisk, trust };
}

/* ----------------------- OpenAI helpers (optional) ----------------------- */
async function openaiJson({ model, system, user, schemaName, schema }){
  if(!OPENAI_API_KEY) throw new Error("No OPENAI_API_KEY");
  const body = {
    model: model || "gpt-4.1-mini",
    messages: [
      { role:"system", content: system },
      { role:"user", content: user }
    ],
    temperature: 0.8,
    response_format: {
      type: "json_schema",
      json_schema: { name: schemaName || "output", schema, strict: true }
    }
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });
  if(!resp.ok){
    const t = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  return JSON.parse(content);
}

async function openaiImage({ prompt, size }){
  if(!OPENAI_API_KEY) throw new Error("No OPENAI_API_KEY");
  const body = {
    model: "gpt-image-1",
    prompt,
    size: size || "1024x1024"
  };
  const resp = await fetch("https://api.openai.com/v1/images", {
    method:"POST",
    headers:{
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });
  if(!resp.ok){
    const t = await resp.text();
    throw new Error(`OpenAI image error ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  // images endpoint returns base64 in data[0].b64_json (commonly)
  const b64 = data.data?.[0]?.b64_json;
  if(!b64) throw new Error("No image b64_json returned");
  return `data:image/png;base64,${b64}`;
}

// JSON Schemas
const SCENARIO_SCHEMA = {
  type:"object",
  additionalProperties:false,
  properties:{
    building:{ type:"object", additionalProperties:false, properties:{
      label:{type:"string"}, type:{type:"string"}, units:{type:"integer"}
    }, required:["label","type","units"]},
    location:{type:"string"},
    scope:{type:"string"},
    risk:{ type:"object", additionalProperties:false, properties:{
      key:{type:"string"}, label:{type:"string"}
    }, required:["key","label"]},
    constraint:{type:"string"},
    smp:{type:"string"}
  },
  required:["building","location","scope","risk","constraint","smp"]
};

const ROUND_SCHEMA = {
  type:"object",
  additionalProperties:false,
  properties:{
    title:{type:"string"},
    prompt:{type:"string"},
    imagePrompt:{type:"string"},
    options:{
      type:"object",
      additionalProperties:false,
      properties:{
        "G&O":{ type:"array", minItems:3, maxItems:3, items:{
          type:"array", minItems:3, maxItems:3, items:{type:"string"}
        }},
        "Ecoresult":{ type:"array", minItems:3, maxItems:3, items:{
          type:"array", minItems:3, maxItems:3, items:{type:"string"}
        }},
        "IkWilNietMeewerken":{ type:"array", minItems:3, maxItems:3, items:{
          type:"array", minItems:3, maxItems:3, items:{type:"string"}
        }},
        "Beunhaas":{ type:"array", minItems:3, maxItems:3, items:{
          type:"array", minItems:3, maxItems:3, items:{type:"string"}
        }}
      },
      required:["G&O","Ecoresult","IkWilNietMeewerken","Beunhaas"]
    }
  },
  required:["title","prompt","imagePrompt","options"]
};

/* ----------------------- Rooms ----------------------- */
const rooms = new Map();

function newRoom(){
  const roomId = randCode();
  const scenario = createScenario(roomId);
  const room = {
    createdAt: now(),
    roomId,
    facilitatorSocketId: null,
    teams: {},
    roundIndex: 0,
    scenario,
    round: null,
    choices: {},
    score: 0,
    risk: 0,
    trust: { "G&O":0, "Ecoresult":0, "IkWilNietMeewerken":0, "Beunhaas":0 },
    log: [],
    images: {}, // roundId -> {prompt, url}
    ai: {
      enabled: false,
      imagesEnabled: true,
      lastError: null
    }
  };
  rooms.set(roomId, room);
  return roomId;
}

function log(room, tag, msg){
  room.log.push({ ts: now(), tag, msg });
  if(room.log.length > 600) room.log.shift();
}
function clearChoices(room){ room.choices = {}; }
function allRolesChosen(room){ return ROLES.every(r => room.choices[r] && room.choices[r].choiceKey); }

function getBaseRound(room){
  const tpl = BASE_ROUNDS[room.roundIndex] || null;
  if(!tpl) return null;
  return {
    id: tpl.id,
    title: tpl.title,
    prompt: tpl.prompt(room.scenario),
    options: tpl.options,
    imagePrompt: imagePromptForRound(tpl.id, room.scenario)
  };
}

async function maybeAiScenario(room){
  if(!room.ai.enabled) return;
  try{
    const system = "Je bent een ecologie/vergunningen spelscenario generator voor woningcorporaties. Genereer realistische NL-casus voor Flora & Fauna quickscan/onderzoek/vergunning/uitvoering. Geen bedrijfsnamen, geen logo's, geen tekst in 'image prompts'.";
    const user = "Genereer 1 scenario-object met: building(label,type,units), location, scope, risk(key,label), constraint, smp. Houd het realistisch voor woningcorporaties.";
    const s = await openaiJson({ system, user, schemaName:"scenario", schema: SCENARIO_SCHEMA });
    room.scenario = s;
    room.ai.lastError = null;
    log(room,"AI","AI scenario gegenereerd.");
  } catch(e){
    room.ai.lastError = String(e.message || e);
    log(room,"AI-fout", room.ai.lastError);
  }
}

async function maybeAiRound(room, roundId){
  if(!room.ai.enabled) return null;
  try{
    const base = getBaseRound(room);
    const system = "Je maakt een korte, speelse maar realistische ronde voor een multiplayer rollenspel (woningcorporatie, ecologisch bureau, bevoegd gezag, aannemer). Elke rol krijgt EXACT 3 keuzes A/B/C. Keuzes moeten plausibel zijn, in NL-context. Schrijf compact.";
    const user = `Scenario: gebouw=${room.scenario.building.label}, units=${room.scenario.building.units}, locatie=${room.scenario.location}, scope=${room.scenario.scope}, risico=${room.scenario.risk.label}, constraint=${room.scenario.constraint}, SMP=${room.scenario.smp}.
Maak een variant op de volgende ronde (basis): title="${base.title}", prompt="${base.prompt}".
Output moet voldoen aan schema. Elke optie is ["A"|"B"|"C", korte titel, 1 zin uitleg].`;
    const r = await openaiJson({ system, user, schemaName:`round_${roundId}`, schema: ROUND_SCHEMA, model:"gpt-4.1-mini" });
    // enforce A/B/C keys order if model messed up
    for(const role of ROLES){
      r.options[role] = r.options[role].map(arr=>{
        arr[0] = (arr[0]||"").trim().toUpperCase();
        return arr;
      });
    }
    room.ai.lastError = null;
    log(room,"AI",`AI ronde variant gemaakt (${roundId}).`);
    return { ...r, id: roundId };
  } catch(e){
    room.ai.lastError = String(e.message || e);
    log(room,"AI-fout", room.ai.lastError);
    return null;
  }
}

async function maybeAiImage(room, round){
  if(!room.ai.enabled || !room.ai.imagesEnabled) return;
  if(!OPENAI_API_KEY) return;
  try{
    const url = await openaiImage({ prompt: round.imagePrompt, size: "1024x1024" });
    room.images[round.id] = { prompt: round.imagePrompt, url };
    room.ai.lastError = null;
    log(room,"AI","AI beeld gegenereerd.");
  } catch(e){
    room.ai.lastError = String(e.message || e);
    // keep prompt but no url
    room.images[round.id] = room.images[round.id] || { prompt: round.imagePrompt, url: null };
    log(room,"AI-fout", room.ai.lastError);
  }
}

function emitRoom(roomId){
  const room = rooms.get(roomId);
  if(!room) return;
  io.to(roomId).emit("room_state", {
    roomId,
    createdAt: room.createdAt,
    scenario: room.scenario,
    roundIndex: room.roundIndex,
    round: room.round,
    teams: room.teams,
    choices: room.choices,
    score: room.score,
    risk: room.risk,
    trust: room.trust,
    log: room.log.slice(-60),
    images: room.images,
    ai: {
      enabled: room.ai.enabled,
      imagesEnabled: room.ai.imagesEnabled,
      lastError: room.ai.lastError,
      hasKey: Boolean(OPENAI_API_KEY)
    }
  });
}

/* ----------------------- Socket IO ----------------------- */
io.on("connection", (socket)=>{
  socket.on("create_room", ()=>{
    const roomId = newRoom();
    socket.emit("room_created", { roomId });
  });

  socket.on("join_room", ({ roomId, asFacilitator })=>{
    const room = rooms.get(roomId);
    if(!room) return socket.emit("error_msg", "Room bestaat niet.");
    socket.join(roomId);

    if(asFacilitator){
      room.facilitatorSocketId = socket.id;
      log(room,"Facilitator","Facilitator is verbonden.");
      socket.emit("joined", { roomId, role:"Facilitator" });
      emitRoom(roomId);
      return;
    }
    socket.emit("joined", { roomId, role:"Player" });
    emitRoom(roomId);
  });

  socket.on("claim_role", ({ roomId, roleKey, teamName })=>{
    const room = rooms.get(roomId);
    if(!room) return socket.emit("error_msg", "Room bestaat niet.");
    if(!ROLES.includes(roleKey)) return socket.emit("error_msg", "Onbekende rol.");
    const existing = room.teams[roleKey];
    if(existing && existing.connected && existing.socketId !== socket.id){
      return socket.emit("error_msg", "Deze rol is al bezet.");
    }
    room.teams[roleKey] = { name: teamName || roleKey, socketId: socket.id, connected:true };
    log(room,"Team",`${roleKey} is bezet door '${room.teams[roleKey].name}'.`);
    emitRoom(roomId);
  });

  socket.on("set_ai_mode", async ({ roomId, enabled, imagesEnabled })=>{
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.facilitatorSocketId !== socket.id) return;
    if(enabled && !OPENAI_API_KEY){
      room.ai.enabled = false;
      room.ai.lastError = "OPENAI_API_KEY ontbreekt op de server.";
      log(room,"AI-fout", room.ai.lastError);
    } else {
      room.ai.enabled = Boolean(enabled);
      if(typeof imagesEnabled === "boolean") room.ai.imagesEnabled = imagesEnabled;
      room.ai.lastError = null;
      log(room,"AI",`AI-mode: ${room.ai.enabled?"AAN":"UIT"} (beelden: ${room.ai.imagesEnabled?"AAN":"UIT"})`);
    }
    emitRoom(roomId);
  });

  socket.on("start_game", async ({ roomId })=>{
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.facilitatorSocketId !== socket.id) return;

    room.roundIndex = 0;
    room.score = 0;
    room.risk = 0;
    room.trust = { "G&O":0, "Ecoresult":0, "IkWilNietMeewerken":0, "Beunhaas":0 };
    clearChoices(room);
    room.images = {};
    room.log = [];
    log(room,"Start","Game gestart.");

    await maybeAiScenario(room);

    // create round
    let round = getBaseRound(room);
    const aiRound = await maybeAiRound(room, round.id);
    if(aiRound) round = aiRound;

    room.round = round;
    room.images[round.id] = { prompt: round.imagePrompt, url: null };
    emitRoom(roomId);

    // async image generation
    await maybeAiImage(room, round);
    emitRoom(roomId);
  });

  socket.on("new_scenario", async ({ roomId })=>{
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.facilitatorSocketId !== socket.id) return;

    room.round = null;
    room.roundIndex = 0;
    clearChoices(room);
    room.score = 0;
    room.risk = 0;
    room.trust = { "G&O":0, "Ecoresult":0, "IkWilNietMeewerken":0, "Beunhaas":0 };
    room.images = {};
    log(room,"Scenario","Nieuw scenario…");

    if(room.ai.enabled) await maybeAiScenario(room);
    else room.scenario = createScenario(roomId + "-" + Date.now());

    emitRoom(roomId);
  });

  socket.on("submit_choice", async ({ roomId, roleKey, choiceKey })=>{
    const room = rooms.get(roomId);
    if(!room) return;
    if(!ROLES.includes(roleKey)) return;
    if(!room.teams[roleKey] || room.teams[roleKey].socketId !== socket.id){
      return socket.emit("error_msg", "Je hebt deze rol niet geclaimd.");
    }
    if(!room.round) return socket.emit("error_msg", "Game is nog niet gestart.");
    const opts = room.round.options?.[roleKey] || [];
    if(!opts.some(o => o[0]===choiceKey)){
      return socket.emit("error_msg", "Ongeldige keuze.");
    }
    room.choices[roleKey] = { roundId: room.round.id, choiceKey, ts: now() };
    log(room,"Keuze",`${roleKey} koos ${choiceKey}.`);
    emitRoom(roomId);

    if(allRolesChosen(room)){
      const choiceMap = {};
      for(const r of ROLES) choiceMap[r] = room.choices[r].choiceKey;
      const res = evaluateRound(choiceMap);

      room.score += res.deltaScore;
      room.risk  += res.deltaRisk;
      for(const k of Object.keys(room.trust)){
        room.trust[k] = Math.max(-5, Math.min(5, room.trust[k] + res.trust[k]));
      }
      log(room,"Effect",`Ronde-effect: score ${res.deltaScore>=0?"+":""}${res.deltaScore}, risico ${res.deltaRisk>=0?"+":""}${res.deltaRisk}.`);

      room.roundIndex = Math.min(BASE_ROUNDS.length, room.roundIndex + 1);
      clearChoices(room);

      if(room.roundIndex >= BASE_ROUNDS.length){
        room.round = null;
        log(room,"Einde","Game klaar. Gebruik KPI’s + log voor nabespreking.");
        emitRoom(roomId);
        return;
      }

      // next round
      let nextRound = getBaseRound(room);
      const aiRound = await maybeAiRound(room, nextRound.id);
      if(aiRound) nextRound = aiRound;

      room.round = nextRound;
      room.images[nextRound.id] = { prompt: nextRound.imagePrompt, url: null };
      log(room,"Ronde", nextRound.title);
      emitRoom(roomId);

      await maybeAiImage(room, nextRound);
      emitRoom(roomId);
    }
  });

  socket.on("reset_room", ({ roomId })=>{
    const room = rooms.get(roomId);
    if(!room) return;
    if(room.facilitatorSocketId !== socket.id) return;
    room.round = null;
    room.roundIndex = 0;
    clearChoices(room);
    room.score = 0;
    room.risk = 0;
    room.trust = { "G&O":0, "Ecoresult":0, "IkWilNietMeewerken":0, "Beunhaas":0 };
    room.log = [];
    room.images = {};
    log(room,"Reset","Room gereset.");
    emitRoom(roomId);
  });

  socket.on("disconnect", ()=>{
    for(const [rid, room] of rooms.entries()){
      for(const roleKey of ROLES){
        const t = room.teams[roleKey];
        if(t && t.socketId === socket.id){
          t.connected = false;
          log(room,"Team",`${roleKey} is offline.`);
          emitRoom(rid);
        }
      }
      if(room.facilitatorSocketId === socket.id){
        room.facilitatorSocketId = null;
        log(room,"Facilitator","Facilitator is offline.");
        emitRoom(rid);
      }
    }
  });
});

server.listen(PORT, ()=> console.log(`Server running on http://localhost:${PORT}`));
