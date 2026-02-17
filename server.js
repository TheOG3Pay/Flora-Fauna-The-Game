
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json({ limit: "2mb" }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
app.get("/facilitator", (req, res) => res.sendFile(path.join(__dirname, "public", "facilitator.html")));
app.get("/display", (req, res) => res.sendFile(path.join(__dirname, "public", "display.html")));

const PORT = process.env.PORT || 3000;

/* ----------------------- Game Model ----------------------- */
const ROLES = ["G&O", "Ecoresult", "IkWilNietMeewerken", "Beunhaas"];

function randCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function nowIso() { return new Date().toISOString(); }

function makeScenarios() {
  return [
    {
      id: "S1",
      title: "Scenario 1 – De Start van het Project",
      narrative:
`G&O start een planmatig onderhoudsproject voor 92 portiekwoningen uit 1964.

Werkzaamheden:
• Dakrenovatie
• Gevelisolatie
• Vervangen kozijnen
• Installatieverbetering

De woningen liggen in een groene wijk met volwassen bomen en water in de buurt.
Ambitie: binnen 18 maanden starten met uitvoering.
Er is nog geen Flora & Fauna onderzoek uitgevoerd.`,
      positions: {
        "G&O":
`Jullie zitten op een strak budget en de verduurzaming is bestuurlijk aangekondigd.
Vertraging boven 3 maanden is politiek gevoelig. Bewoners verwachten duidelijkheid.`,
        "Ecoresult":
`Jullie moeten een juridisch houdbare lijn kiezen, maar de scope is nog niet volledig concreet.
Onvolledige informatie = hoger juridisch risico.`,
        "IkWilNietMeewerken":
`Jullie willen zorgvuldig handelen. Provincie kijkt mee op naleving.
Precedentwerking en volledigheid wegen zwaar.`,
        "Beunhaas":
`Jullie moeten capaciteit 12 maanden vooruit plannen.
Onzekerheid betekent financieel risico en herplanning.`
      },
      options: {
        "G&O": [
          ["A","Start direct met quickscan (globale scope)","Snel starten met een eerste risico-inschatting. Scope is nog grof."],
          ["B","Wacht op volledige technische uitwerking","Eerst alles uitwerken voordat ecologie start. Minder ruis, later start."],
          ["C","Beperk scope in quickscan tot dak","Sneller en goedkoper, maar risico op verrassingen later."]
        ],
        "Ecoresult": [
          ["A","Worst-case benadering","Conservatief: extra voorzichtig, kans op langere doorlooptijd."],
          ["B","Gefaseerde quickscan met voorbehoud","Start nu, maar expliciet: scope kan bijgesteld worden."],
          ["C","Wachten tot scope ‘100%’ is","Pas starten bij volledige informatie. Hoog risico op planningissues."]
        ],
        "IkWilNietMeewerken": [
          ["A","Vooroverleg aanbieden","Meedenken aan de voorkant om later vertraging te beperken."],
          ["B","Volledige onderbouwing eisen","Strak op volledigheid. Veilig, maar kan vertragen."],
          ["C","Afwachtend (formeel pas bij aanvraag)","Geen capaciteit nu. Reageert later op de formele aanvraag."]
        ],
        "Beunhaas": [
          ["A","Capaciteit voorlopig reserveren","Reserveren met ‘escape’ als er vertraging komt."],
          ["B","Wachten tot vergunning rond is","Zekerheid, maar kans dat je plek in planning kwijt raakt."],
          ["C","Andere projecten prioriteren","Zet dit project op de tweede plek. Minder flexibiliteit later."]
        ]
      },
      eval: {
        green: { "G&O":"A", "Ecoresult":"B", "IkWilNietMeewerken":"A", "Beunhaas":"A" },
        orange: {
          "G&O":["C"], "Ecoresult":["A"], "IkWilNietMeewerken":["B"], "Beunhaas":["B"]
        },
        red: {
          "G&O":["B"], "Ecoresult":["C"], "IkWilNietMeewerken":["C"], "Beunhaas":["C"]
        }
      },
      suggestions: [
        "Laat Ecoresult starten met een gefaseerde quickscan mét duidelijke scope-voorbehouden (geen ‘wachten tot alles af is’).",
        "Plan direct een kort vooroverleg met bevoegd gezag om verwachtingen te managen.",
        "Reserveer aannemerscapaciteit voorlopig, maar bouw flexibiliteit in (geen harde startdatum beloven)."
      ],
      feedback: {
        "G&O": {
          green: "🟢 Goed: je zet het traject vroeg in beweging zonder onrealistische zekerheden te beloven.",
          orange: "🟠 Bijna: dit kan, maar maak afspraken over scope/verwachtingen om verrassingen later te voorkomen.",
          red: "🔴 No-go: hiermee schuif je ecologie te laat naar achteren; grote kans op latere stilstand en reputatieschade."
        },
        "Ecoresult": {
          green: "🟢 Goed: gefaseerd starten met duidelijke voorbehouden houdt het juridisch verdedigbaar én werkbaar.",
          orange: "🟠 Bijna: je bent zorgvuldig, maar let op dat ‘worst-case’ de planning onnodig zwaar kan belasten.",
          red: "🔴 No-go: wachten tot alles 100% is legt de planning plat; dit werkt in de praktijk bijna nooit."
        },
        "IkWilNietMeewerken": {
          green: "🟢 Goed: vooroverleg helpt om later geen ‘verrassingen’ te krijgen en houdt het besluit uitlegbaar.",
          orange: "🟠 Bijna: streng op volledigheid is veilig, maar kan onnodig vertragen zonder vooroverleg.",
          red: "🔴 No-go: afwachten tot de formele aanvraag vergroot het risico op miscommunicatie en vertraging."
        },
        "Beunhaas": {
          green: "🟢 Goed: je reserveert slim met flexibiliteit; dat helpt het project én beperkt faalkosten.",
          orange: "🟠 Bijna: wachten is veilig, maar je verliest momentum en kans op capaciteit in de gewenste periode.",
          red: "🔴 No-go: prioriteit verleggen maakt het project later moeilijk uitvoerbaar en vergroot claims/druk."
        }
      }
    },
    {
      id: "S2",
      title: "Scenario 2 – De Vondst",
      narrative:
`Tijdens inspectie worden aanwijzingen van vleermuisactiviteit gevonden in meerdere spouwmuren.
Het broedseizoen start over 4 weken.

De planning was om over 6 maanden te starten met uitvoering.
Als het seizoen-venster wordt gemist, kan dat 6–12 maanden vertraging betekenen.`,
      positions: {
        "G&O":
`Startdatum is al ‘soft’ genoemd richting bewoners. Te veel vertraging schaadt draagvlak.
Jullie moeten kiezen: snelheid, fasering of extra onderzoek.`,
        "Ecoresult":
`De vondst vergroot de juridische druk. Seizoensgebonden onderzoek kan noodzakelijk zijn.
Onzorgvuldigheid kan leiden tot afwijzing of handhaving.`,
        "IkWilNietMeewerken":
`Natuur ligt gevoelig in de gemeente. Media en politiek kijken mee.
Jullie willen zorgvuldig én uitlegbaar handelen.`,
        "Beunhaas":
`Materieel en mensen zijn ingepland. Stilstand kost geld.
Jullie willen door met werk, liefst gefaseerd.`
      },
      options: {
        "G&O": [
          ["A","Direct volledig nader onderzoek starten","Zekerheid, maar kans op forse vertraging."],
          ["B","Mitigatie voorbereiden parallel aan onderzoek","Tijd winnen, maar vraagt strakke afstemming."],
          ["C","Gefaseerd uitvoeren: eerst ‘schone’ delen","Beperkt stilstand, maar complexer in uitvoering."]
        ],
        "Ecoresult": [
          ["A","Volledig seizoensonderzoek eisen","Maximaal zorgvuldig, grootste planning-impact."],
          ["B","Gefaseerd onderzoek + mitigatie combineren","Praktisch compromis: zorgvuldig én tempo."],
          ["C","Alleen noodmaatregel adviseren","Snel, maar juridisch kwetsbaar als het niet klopt."]
        ],
        "IkWilNietMeewerken": [
          ["A","Strikte naleving: onderzoek eerst","Veilig, maar kan politieke druk opleveren door vertraging."],
          ["B","Versnellen via vooroverleg en duidelijke voorwaarden","Samen naar een houdbare, snellere route."],
          ["C","Tijdelijke ruimte geven zonder harde onderbouwing","Snel, maar hoog risico op precedent/bezwaar."]
        ],
        "Beunhaas": [
          ["A","Startdatum verschuiven en wachten","Rust, maar duur."],
          ["B","Deelproject starten op laag-risico onderdelen","Beperkt stilstand, blijft flexibel."],
          ["C","Druk zetten om ‘gewoon te beginnen’","Snel, maar verhoogt conflict en juridisch risico."]
        ]
      },
      eval: {
        green: { "G&O":"C", "Ecoresult":"B", "IkWilNietMeewerken":"B", "Beunhaas":"B" },
        orange: {
          "G&O":["B"], "Ecoresult":["A"], "IkWilNietMeewerken":["A"], "Beunhaas":["A"]
        },
        red: {
          "G&O":["A"], "Ecoresult":["C"], "IkWilNietMeewerken":["C"], "Beunhaas":["C"]
        }
      },
      suggestions: [
        "Kies voor fasering: start met laag-risico onderdelen terwijl onderzoek/mitigatie loopt.",
        "Maak met bevoegd gezag vooraf duidelijke voorwaarden: wat moet minimaal rond zijn vóór start?",
        "Vermijd ‘noodmaatregelen’ zonder onderbouwing; dat wordt snel juridisch kwetsbaar."
      ],
      feedback: {
        "G&O": {
          green: "🟢 Goed: faseren houdt de boel in beweging én geeft ruimte voor ecologie.",
          orange: "🟠 Bijna: parallel mitigeren kan, maar alleen met strakke afspraken en heldere stop-go momenten.",
          red: "🔴 No-go: alleen ‘onderzoek, onderzoek’ zonder fasering kan onnodig draagvlak en planning slopen."
        },
        "Ecoresult": {
          green: "🟢 Goed: onderzoek + mitigatie combineren is vaak de meest werkbare en juridisch houdbare route.",
          orange: "🟠 Bijna: volledig seizoensonderzoek is zorgvuldig, maar kijk of een slimmer compromis mogelijk is.",
          red: "🔴 No-go: noodmaatregelen zonder basis kunnen later leiden tot afwijzing of handhaving."
        },
        "IkWilNietMeewerken": {
          green: "🟢 Goed: versnellen via vooroverleg en voorwaarden maakt het besluit beter verdedigbaar.",
          orange: "🟠 Bijna: strikt ‘eerst onderzoek’ is veilig, maar kan onnodig vertragen zonder maatwerk.",
          red: "🔴 No-go: ruimte geven zonder onderbouwing vergroot precedent- en bezwaarrisico."
        },
        "Beunhaas": {
          green: "🟢 Goed: starten met laag-risico deelwerk beperkt stilstand en houdt teams productief.",
          orange: "🟠 Bijna: alles doorschuiven voorkomt fouten, maar kost veel geld en energie.",
          red: "🔴 No-go: druk zetten om ‘gewoon te beginnen’ verhoogt conflict en juridisch risico enorm."
        }
      }
    },
    {
      id: "S3",
      title: "Scenario 3 – Vergunning onder Druk",
      narrative:
`Bevoegd gezag vraagt aanvullende onderbouwing in de vergunningaanvraag.
De aannemer heeft startdatum ingepland en er is al extern gecommuniceerd over de verduurzaming.

De keuze is nu: extra onderzoek, voorwaardelijke vergunning, of opschorten.
Elke stap heeft impact op planning, geld én vertrouwen.`,
      positions: {
        "G&O":
`Reputatie is kwetsbaar: beloftes richting bewoners en bestuur.
Jullie moeten laten zien dat je ‘in control’ bent zonder de juridische basis te verliezen.`,
        "Ecoresult":
`De onderbouwing moet robuust zijn. Als het wankel is, valt het later om (bezwaar/handhaving).
Jullie willen kwaliteit leveren én tempo houden.`,
        "IkWilNietMeewerken":
`Een besluit moet verdedigbaar zijn. Jurist kijkt mee. Precedentwerking speelt.
Jullie zoeken een oplossing die juridisch klopt en uitlegbaar is.`,
        "Beunhaas":
`Contracten en planning lopen. Jullie willen door met werk zonder claims of stilstand.
Liever: alternatieve werkzaamheden starten dan ‘niets doen’.`
      },
      options: {
        "G&O": [
          ["A","Extra onderzoek financieren en planning herijken","Duurder, maar vergroot kans op groen."],
          ["B","Gefaseerd starten met strikt ‘stop-go’ moment","Tempo, maar vraagt harde afspraken."],
          ["C","Escaleren: juridisch bezwaar/druk uitoefenen","Risicovol: kan vertrouwen en traject schaden."]
        ],
        "Ecoresult": [
          ["A","Aanvullend onderzoek uitvoeren","Robuust, maar kost tijd."],
          ["B","Onderbouwing herstructureren + aanvullingen gericht","Slimmer: alleen ontbrekende stukken aanvullen."],
          ["C","Aanvraag verdedigen zoals die is","Snel, maar kan later omvallen."]
        ],
        "IkWilNietMeewerken": [
          ["A","Vergunning uitstellen tot alles rond is","Veilig, maar veel vertraging."],
          ["B","Voorwaardelijke vergunning met heldere voorwaarden","Compromis: juridisch én tempo."],
          ["C","Afwijzen","Hard stop. Groot politiek en projectrisico."]
        ],
        "Beunhaas": [
          ["A","Startdatum verschuiven","Eerlijk, maar kost geld."],
          ["B","Alternatieve werkzaamheden starten (laag risico)","Beperkt stilstand, houdt project in beweging."],
          ["C","Claim indienen / druk zetten","Escalatie: juridisch conflict en reputatieschade."]
        ]
      },
      eval: {
        green: { "G&O":"A", "Ecoresult":"B", "IkWilNietMeewerken":"B", "Beunhaas":"B" },
        orange: {
          "G&O":["B"], "Ecoresult":["A"], "IkWilNietMeewerken":["A"], "Beunhaas":["A"]
        },
        red: {
          "G&O":["C"], "Ecoresult":["C"], "IkWilNietMeewerken":["C"], "Beunhaas":["C"]
        }
      },
      suggestions: [
        "Stuur op ‘voorwaardelijke vergunning’ met expliciete stop-go momenten.",
        "Laat Ecoresult gericht aanvullingen doen (geen ‘alles opnieuw’), maar wel juridisch robuust.",
        "Houd aannemer aan het werk met alternatieve/laag-risico werkzaamheden om claims te beperken."
      ],
      feedback: {
        "G&O": {
          green: "🟢 Goed: je investeert in robuustheid en herijkt de planning; dat voorkomt ellende later.",
          orange: "🟠 Bijna: gefaseerd starten kan, maar alleen als iedereen het stop-go moment echt respecteert.",
          red: "🔴 No-go: escaleren/druk zetten breekt vertrouwen en maakt het traject vaak langer en duurder."
        },
        "Ecoresult": {
          green: "🟢 Goed: gerichte aanvullingen + sterke structuur is vaak sneller dan ‘alles opnieuw’.",
          orange: "🟠 Bijna: extra onderzoek is veilig, maar check of gerichte aanvullingen voldoende zijn.",
          red: "🔴 No-go: ‘verdedigen zoals het is’ kan later omvallen bij bezwaar/handhaving."
        },
        "IkWilNietMeewerken": {
          green: "🟢 Goed: voorwaardelijke vergunning is een verdedigbaar compromis tussen zorgvuldigheid en tempo.",
          orange: "🟠 Bijna: uitstellen is veilig, maar kan onnodig vertragen als voorwaarden ook kunnen werken.",
          red: "🔴 No-go: afwijzen is een harde stop met grote impact; alleen bij echt onvoldoende basis."
        },
        "Beunhaas": {
          green: "🟢 Goed: alternatieve werkzaamheden houden productie op gang en beperken claims.",
          orange: "🟠 Bijna: startdatum schuiven is eerlijk, maar probeer stilstand te voorkomen met ander werk.",
          red: "🔴 No-go: claimen/druk zetten escaleert; vaak verlies je tijd én relatie."
        }
      }
    }
  ];
}

const SECRET_GOALS = {
  "G&O": [
    "Houd de vertraging beperkt; bewonersvertrouwen is kwetsbaar.",
    "Vermijd budgetoverschrijding; stuur op voorspelbaarheid.",
    "Laat zien dat je ‘in control’ bent richting bestuur."
  ],
  "Ecoresult": [
    "Voorkom een juridisch kwetsbare route; kwaliteit boven snelheid.",
    "Zorg dat mitigatie/protocol realistisch en uitvoerbaar blijft.",
    "Minimaliseer kans op afwijzing of bezwaar."
  ],
  "IkWilNietMeewerken": [
    "Voorkom precedent; wees consistent en uitlegbaar.",
    "Beperk bestuurlijk risico door verdedigbare besluiten.",
    "Houd het proces zorgvuldig (jurist kijkt mee)."
  ],
  "Beunhaas": [
    "Voorkom stilstand; houd werkpakket draaiend.",
    "Beperk faalkosten; voorkom late wijzigingen.",
    "Minimaliseer kans op claims door duidelijke afspraken."
  ]
};

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* Room state */
function makeRoom(roomId){
  const scenarios = makeScenarios();
  const secretGoals = {};
  ROLES.forEach(r=> secretGoals[r] = pick(SECRET_GOALS[r]));

  return {
    roomId,
    createdAt: nowIso(),
    phase: "lobby",          // lobby | scenario | results | reflection | done
    scenarioIndex: -1,
    scenarioEndsAt: null,
    reflectionEndsAt: null,
    remaining: 0,
    transparency: false,
    transparencyRequestedBy: {},
    teams: {                 // role -> { name, connected, socketId }
      "G&O": null, "Ecoresult": null, "IkWilNietMeewerken": null, "Beunhaas": null
    },
    choices: {},             // role -> { choiceKey, ts }
    outcome: null,           // computed after scenario
    outcomeText: null,       // per-role feedback texts after scenario
    reflections: [],         // { scenarioId, role, text, ts }
    scenarios,
    secretGoals,
    log: [],
    helpRequests: [],
    timerExpired: false,
    readyToEnd: false
  };
}

const rooms = new Map(); // roomId -> room

function log(room, tag, msg){
  room.log.push({ tag, msg, ts: Date.now() });
  if(room.log.length > 200) room.log.shift();
}

function evaluateScenario(room){
  const scenario = room.scenarios[room.scenarioIndex];
  const evalSpec = scenario.eval;
  const perRole = {};
  const perRoleText = {};
  let anyRed = false;
  let anyOrange = false;

  ROLES.forEach(role=>{
    const chosen = room.choices[role]?.choiceKey || null;
    const g = evalSpec.green[role];
    const o = (evalSpec.orange[role] || []);
    const r = (evalSpec.red[role] || []);
    let color = "orange";
    if(chosen === g) color = "green";
    else if(r.includes(chosen) || chosen === null) color = "red";
    else if(o.includes(chosen)) color = "orange";
    else color = "orange";
    perRole[role] = { choiceKey: chosen, color };
    const fb = (scenario.feedback && scenario.feedback[role]) ? scenario.feedback[role] : null;
    perRoleText[role] = fb ? (fb[color] || "") : "";
    if(color === "red") anyRed = true;
    if(color === "orange") anyOrange = true;
  });

  const overall = anyRed ? "red" : (anyOrange ? "orange" : "green");
  const greenTarget = evalSpec.green;
  const toGreen = {};
  ROLES.forEach(role=>{
    const want = greenTarget[role];
    const have = perRole[role]?.choiceKey || null;
    if(have !== want) toGreen[role] = { from: have, to: want };
  });

  return {
    scenarioId: scenario.id,
    overall,
    perRole,
    perRoleText,
    suggestions: scenario.suggestions,
    greenTarget,
    toGreen
  };
}

function stateForClient(room, role=null, isFacilitator=false, isDisplay=false){
  const scenario = (room.scenarioIndex >= 0 && room.scenarioIndex < room.scenarios.length)
    ? room.scenarios[room.scenarioIndex] : null;

  const base = {
    roomId: room.roomId,
    phase: room.phase,
    scenarioIndex: room.scenarioIndex,
    remaining: room.remaining,
    timerExpired: !!room.timerExpired,
    readyToEnd: !!room.readyToEnd,
    transparency: room.transparency,
    teams: Object.fromEntries(ROLES.map(r=> [r, room.teams[r] ? { name: room.teams[r].name, connected: room.teams[r].connected } : null])),
    choices: Object.fromEntries(ROLES.map(r=> [r, room.choices[r] ? { choiceKey: room.choices[r].choiceKey } : null])),
    outcome: room.outcome,
  };

  if(scenario){
    base.scenario = {
      id: scenario.id,
      title: scenario.title,
      narrative: scenario.narrative,
    };
    if(isDisplay){
      base.display = {
        suggestions: scenario.suggestions,
        positions: null
      };
    }
  }

  if(role && scenario){
    base.my = {
      role,
      secretGoal: room.secretGoals[role],
      position: scenario.positions[role],
      options: scenario.options[role]
    };
    if(room.outcome){
      base.my.outcome = {
        color: room.outcome.perRole?.[role]?.color || null,
        choiceKey: room.outcome.perRole?.[role]?.choiceKey || null,
        text: room.outcome.perRoleText?.[role] || ""
      };
    }
  }

  if(isFacilitator){
    const currentScenario = (room.scenarioIndex >= 0) ? room.scenarios[room.scenarioIndex] : null;
    const greenTarget = currentScenario ? currentScenario.eval.green : null;
    base.facilitator = {
      reflectionsCount: room.reflections.length,
      helpRequests: room.helpRequests || [],
      readyToEnd: !!room.readyToEnd,
      timerExpired: !!room.timerExpired,
      greenTarget
    };
  }

  return base;
}

/* ----------------------- Timers ----------------------- */
function clearRoomTimers(room){
  if(room._tick){
    clearInterval(room._tick);
    room._tick = null;
  }
}
function startTick(room){
  clearRoomTimers(room);
  room._tick = setInterval(()=>{
    if(room.phase === "scenario" || room.phase === "reflection"){
      room.remaining = Math.max(0, room.remaining - 1);
      broadcastRoom(room);
      if(room.remaining <= 0){
        room.remaining = 0;
        room.timerExpired = true;
        clearRoomTimers(room);
        log(room, "TIMER", `Timer verlopen in fase ${room.phase}. Wacht op facilitator.`);
        broadcastRoom(room);
      }
    }
  }, 1000);
}

function broadcastRoom(room){
  io.to(room.roomId).emit("room_state", stateForClient(room, null, false, false));
  // per role personalized state
  ROLES.forEach(role=>{
    const t = room.teams[role];
    if(t && t.socketId){
      io.to(t.socketId).emit("room_state_role", stateForClient(room, role, false, false));
    }
  });
  // facilitator sockets
  if(room._facilitatorSocketId){
    io.to(room._facilitatorSocketId).emit("room_state_fac", stateForClient(room, null, true, false));
  }
  // display sockets
  if(room._displaySocketId){
    io.to(room._displaySocketId).emit("room_state_display", stateForClient(room, null, false, true));
  }
}

/* ----------------------- Phase transitions ----------------------- */
function startGame(room){
  room.phase = "scenario";
  room.scenarioIndex = 0;
  room.choices = {};
  room.outcome = null;
  room.transparency = false;
  room.transparencyRequestedBy = {};
  room.remaining = 300; // 5 min
  room.timerExpired = false;
  room.readyToEnd = false;
  room.helpRequests = [];
  log(room, "START", "Game gestart (Scenario 1).");
  startTick(room);
  broadcastRoom(room);
}
function endScenario(room, reason){
  const scenario = room.scenarios[room.scenarioIndex];
  // compute outcome
  room.outcome = evaluateScenario(room);

  // build decision breakdown for display
  const decisionBreakdown = {};
  ROLES.forEach(role=>{
    const chosen = room.outcome.perRole?.[role]?.choiceKey || null;
    const opt = (scenario.options?.[role] || []).find(o=>o[0]===chosen);
    decisionBreakdown[role] = {
      choiceKey: chosen,
      label: opt ? opt[1] : "-",
      rationale: opt ? opt[2] : "",
      color: room.outcome.perRole?.[role]?.color || "orange"
    };
  });

  // short narrative: what combination was chosen
  const chosenLine = ROLES.map(r=>{
    const d = decisionBreakdown[r];
    return `${r}: ${d.choiceKey || "-"} (${d.label})`;
  }).join(" | ");

  // to-green hint (for facilitator)
  const toGreen = room.outcome.toGreen || {};
  const toGreenLine = Object.entries(toGreen).map(([r,v])=> `${r}: ${v.from||"-"} → ${v.to}`).join(" | ");

  room.outcome.decisionBreakdown = decisionBreakdown;
  room.outcome.chosenLine = chosenLine;
  room.outcome.toGreenLine = toGreenLine;

  log(room, "SCENARIO", `Scenario ${room.outcome.scenarioId} afgerond (${reason}). Uitkomst: ${room.outcome.overall.toUpperCase()}. Keuzes: ${chosenLine}`);
  // Move to results (facilitator starts reflection manually)
  room.phase = "results";
  room.remaining = 0;
  room.timerExpired = false;
  room.readyToEnd = false;
  clearRoomTimers(room);
  broadcastRoom(room);
}

function startReflection(room){
  room.phase = "reflection";
  room.remaining = 60; // 1 min reflectie
  room.timerExpired = false;
  room.readyToEnd = false;
  room.helpRequests = [];
  log(room, "REFLECTIE", "Reflectie gestart.");
  startTick(room);
  broadcastRoom(room);
}
function endReflection(room, reason){
  log(room, "REFLECTIE", `Reflectie afgerond (${reason}).`);
  // next scenario or done
  if(room.scenarioIndex < room.scenarios.length - 1){
    room.phase = "scenario";
    room.scenarioIndex += 1;
    room.choices = {};
    room.outcome = null;
    room.transparency = false;
    room.timerExpired = false;
    room.readyToEnd = false;
    room.helpRequests = [];
    room.transparencyRequestedBy = {};
    room.remaining = 300;
    log(room, "NEXT", `Start Scenario ${room.scenarios[room.scenarioIndex].id}.`);
    startTick(room);
  } else {
    room.phase = "done";
    room.remaining = 0;
    log(room, "DONE", "Game afgerond.");
    clearRoomTimers(room);
  }
  broadcastRoom(room);
}

/* ----------------------- HTTP Report (facilitator only) ----------------------- */
app.get("/api/report", (req,res)=>{
  const roomId = String(req.query.roomId||"").toUpperCase();
  const token = String(req.query.token||"");
  const room = rooms.get(roomId);
  if(!room) return res.status(404).json({ error: "Room not found" });
  if(!token || token !== room._facilitatorToken) return res.status(403).json({ error: "Forbidden" });

  res.json({
    roomId: room.roomId,
    createdAt: room.createdAt,
    finishedAt: room.phase === "done" ? nowIso() : null,
    scenarios: room.scenarios.map(s=>({ id:s.id, title:s.title })),
    reflections: room.reflections,
    log: room.log,
  });
});

/* ----------------------- Socket events ----------------------- */
io.on("connection",(socket)=>{
  socket.on("create_room", ()=>{
    let code = randCode();
    while(rooms.has(code)) code = randCode();
    rooms.set(code, makeRoom(code));
    socket.emit("room_created", { roomId: code });
  });

  socket.on("join_room", ({roomId, mode})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Roomcode niet gevonden.");
    socket.join(code);

    if(mode === "facilitator"){
      // assign facilitator token
      const token = room._facilitatorToken || (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
      room._facilitatorToken = token;
      room._facilitatorSocketId = socket.id;
      socket.emit("facilitator_token", { token });
      log(room, "JOIN", "Facilitator verbonden.");
      broadcastRoom(room);
      return;
    }

    if(mode === "display"){
      room._displaySocketId = socket.id;
      log(room, "JOIN", "Display verbonden.");
      broadcastRoom(room);
      return;
    }

    // player
    socket.emit("joined", { roomId: code });
    log(room, "JOIN", "Speler verbonden.");
    broadcastRoom(room);
  });

  socket.on("claim_role", ({roomId, roleKey, teamName})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const role = String(roleKey||"").trim();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    if(!ROLES.includes(role)) return socket.emit("error_msg","Onbekende rol.");
    if(room.teams[role] && room.teams[role].connected) return socket.emit("error_msg","Rol is al bezet.");

    room.teams[role] = { name: String(teamName||role), connected: true, socketId: socket.id };
    socket.data.role = role;
    socket.data.roomId = code;

    log(room, "ROLE", `${role} gekozen door ${room.teams[role].name}.`);
    broadcastRoom(room);
  });

  socket.on("start_game", ({roomId})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    if(room.phase !== "lobby") return socket.emit("error_msg","Game is al gestart.");
    // Require at least 2 roles connected to start (workshop tolerant)
    const connectedCount = ROLES.filter(r=> room.teams[r] && room.teams[r].connected).length;
    if(connectedCount < 2) return socket.emit("error_msg","Minimaal 2 rollen nodig om te starten.");
    startGame(room);
  });

  socket.on("submit_choice", ({roomId, roleKey, choiceKey})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const role = String(roleKey||"").trim();
    const choice = String(choiceKey||"").trim().toUpperCase();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    if(room.phase !== "scenario") return socket.emit("error_msg","Keuzes kunnen alleen tijdens een scenario.");
    if(!ROLES.includes(role)) return socket.emit("error_msg","Onbekende rol.");

    // lock: only role owner
    const team = room.teams[role];
    if(!team || team.socketId !== socket.id) return socket.emit("error_msg","Je hebt deze rol niet.");

    // validate choice
    const scenario = room.scenarios[room.scenarioIndex];
    const opts = scenario.options[role].map(o=>o[0]);
    if(!opts.includes(choice)) return socket.emit("error_msg","Ongeldige keuze.");

    room.choices[role] = { choiceKey: choice, ts: Date.now() };
    log(room, "CHOICE", `${role} koos ${choice}.`);

    // auto end if all connected roles have chosen (and at least 2 roles)
    const connectedRoles = ROLES.filter(r=> room.teams[r] && room.teams[r].connected);
    const allChosen = connectedRoles.every(r=> room.choices[r] && room.choices[r].choiceKey);
    broadcastRoom(room);
    if(allChosen && connectedRoles.length >= 2){
      room.readyToEnd = true;
      log(room, "READY", "Alle keuzes zijn binnen. Wacht op facilitator om af te ronden.");
      broadcastRoom(room);
    }
  });

  socket.on("request_transparency", ({roomId, roleKey})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const role = String(roleKey||"").trim();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    if(room.phase !== "scenario") return socket.emit("error_msg","Transparantie kan alleen tijdens een scenario.");
    if(!ROLES.includes(role)) return socket.emit("error_msg","Onbekende rol.");
    const team = room.teams[role];
    if(!team || team.socketId !== socket.id) return socket.emit("error_msg","Je hebt deze rol niet.");

    room.transparencyRequestedBy[role] = true;
    const count = Object.keys(room.transparencyRequestedBy).length;
    if(count >= 2){
      room.transparency = true;
      log(room, "TRANSPARANTIE", "Transparantie geactiveerd (>=2 teams).");
    } else {
      log(room, "TRANSPARANTIE", `${role} vroeg transparantie aan (${count}/2).`);
    }
    broadcastRoom(room);
  });

  socket.on("request_hint", ({roomId, roleKey})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const role = String(roleKey||"").trim();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    if(room.phase !== "scenario") return socket.emit("error_msg","Hulp kan alleen tijdens een scenario.");
    if(!ROLES.includes(role)) return socket.emit("error_msg","Onbekende rol.");
    const team = room.teams[role];
    if(!team || team.socketId !== socket.id) return socket.emit("error_msg","Je hebt deze rol niet.");

    room.helpRequests.push({ role, ts: Date.now(), scenarioId: room.scenarios[room.scenarioIndex].id });
    if(room.helpRequests.length > 40) room.helpRequests.shift();
    log(room, "HULP", `${role} vraagt hulp om naar GROEN te komen.`);
    broadcastRoom(room);
  });


  socket.on("force_transparency", ({roomId})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    room.transparency = true;
    log(room, "TRANSPARANTIE", "Transparantie geforceerd door facilitator.");
    broadcastRoom(room);
  });

  socket.on("start_reflection", ({roomId})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    if(room.phase !== "results") return socket.emit("error_msg","Reflectie kan alleen vanuit het resultaten-scherm.");
    startReflection(room);
  });

  socket.on("submit_reflection", ({roomId, roleKey, text})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const role = String(roleKey||"").trim();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    if(room.phase !== "reflection") return socket.emit("error_msg","Reflectie is nu niet actief.");
    const team = room.teams[role];
    if(!team || team.socketId !== socket.id) return socket.emit("error_msg","Je hebt deze rol niet.");
    const t = String(text||"").trim().slice(0, 250);
    room.reflections.push({ scenarioId: room.scenarios[room.scenarioIndex].id, role, text: t, ts: Date.now() });
    log(room, "REFLECTIE", `${role} reflectie ontvangen.`);
    broadcastRoom(room);
  });

  socket.on("next", ({roomId})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    if(room.phase === "results"){
      startReflection(room);
    } else if(room.phase === "reflection"){
      endReflection(room, "facilitator");
    } else if(room.phase === "scenario"){
      endScenario(room, "facilitator");
    } else {
      socket.emit("error_msg","Kan nu niet doorgaan.");
    }
  });

  socket.on("reset_room", ({roomId})=>{
    const code = String(roomId||"").trim().toUpperCase();
    const room = rooms.get(code);
    if(!room) return socket.emit("error_msg","Room niet gevonden.");
    clearRoomTimers(room);
    const fresh = makeRoom(code);
    // keep facilitator token so report remains tied
    fresh._facilitatorToken = room._facilitatorToken;
    rooms.set(code, fresh);
    log(fresh, "RESET", "Room gereset.");
    broadcastRoom(fresh);
  });

  socket.on("disconnect", ()=>{
    const roomId = socket.data.roomId;
    const role = socket.data.role;
    if(!roomId) return;
    const room = rooms.get(roomId);
    if(!room) return;

    if(role && room.teams[role] && room.teams[role].socketId === socket.id){
      room.teams[role].connected = false;
      room.teams[role].socketId = null;
      log(room, "LEAVE", `${role} disconnected.`);
    }
    if(room._facilitatorSocketId === socket.id){
      room._facilitatorSocketId = null;
      log(room, "LEAVE", "Facilitator disconnected.");
    }
    if(room._displaySocketId === socket.id){
      room._displaySocketId = null;
      log(room, "LEAVE", "Display disconnected.");
    }
    broadcastRoom(room);
  });
});

server.listen(PORT, () => console.log("Server listening on", PORT));
