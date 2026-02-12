# Operatie Oude Eik – Multiplayer v4 (AI-mode + echte multiplayer)

## Routes
- Players: `/`
- Facilitator: `/facilitator`

## AI-mode (facilitator)
- Zet **OPENAI_API_KEY** als environment variable op je host (Render/GitHub/whatever).
- In `/facilitator` kun je AI-mode aanzetten.
- AI-mode doet:
  - Nieuwe scenario's genereren (tekst + parameters)
  - Per ronde variaties in prompts & keuzeopties
  - (Optioneel) een AI-beeld genereren per ronde (als je dit aan laat staan)

> Geen key? Dan werkt het spel nog steeds (fallback scenario + vaste rondetemplates).

## Lokaal draaien
```bash
npm install
npm start
```
Open:
- http://localhost:3000
- http://localhost:3000/facilitator

## Render (simpelste)
Build: `npm install`  
Start: `node server.js`  
Env: `OPENAI_API_KEY=...`

