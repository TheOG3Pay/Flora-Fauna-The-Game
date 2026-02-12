# Operatie Oude Eik – Multiplayer (Render-ready)

Echte multiplayer webgame (4 teams + 1 facilitator) over het Flora & Fauna ketenproces.

**Teams / rollen**
- 🏢 G&O (corporatie)
- 🌿 Ecoresult (ecologisch adviesbureau)
- 🏛️ IkWilNietMeewerken (bevoegd gezag)
- 🔨 Beunhaas (aannemer)

**Wat zit erin**
- Rooms + roomcode
- Rollen claimen (1 team per rol)
- Fases + timer per fase
- Stemronde A/B/C met automatische gevolgen
- Complicatiekaarten (random)
- Score + risico
- Live logboek (kopiëren)

---

## 1) Lokaal testen (optioneel)
Alleen nodig als je eerst lokaal wilt testen.

```bash
npm install
npm start
```
Open daarna: http://localhost:3000

---

## 2) Gratis online zetten via Render (stap voor stap)

### A) Upload naar GitHub (via browser)
1. Maak een nieuwe GitHub repository (bijv. `oude-eik-game`).
2. Upload **de inhoud van deze map** naar de root van je repo:
   - `server.js`
   - `package.json`
   - `public/index.html`
3. Let op: `server.js` en `package.json` moeten in de **root** staan (niet in een submap).

### B) Deploy op Render (gratis)
1. Render → **New +** → **Web Service**
2. Koppel je GitHub repo.
3. Stel in:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. Klik **Create Web Service** en wacht tot je service “Live” is.

### C) Spelen (1 link)
1. Open je Render URL (bijv. `https://...onrender.com`) op het scherm.
2. Facilitator: klik **Create room** → deel roomcode.
3. Teams: open dezelfde URL → **Join** → claim rol → speel mee.
4. Facilitator bestuurt fases: **Start fase / Volgende fase / Trek complicatie / Reset**.

---

## Troubleshooting
- **Cannot find server.js** → bestanden staan niet in de root van je GitHub repo.
- **Free tier sleep** → eerste load kan wat trager zijn (refresh helpt).
- **Teams zien elkaar niet** → check: zelfde URL + zelfde roomcode.

Veel succes met het Vastgoedlab!
