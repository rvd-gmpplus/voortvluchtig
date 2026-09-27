# VOORTVLUCHTIG

[![Pages](https://github.com/rvd-gmpplus/voortvluchtig/actions/workflows/pages.yml/badge.svg)](https://github.com/rvd-gmpplus/voortvluchtig/actions/workflows/pages.yml)

3D ontsnappingsgame voor de (mobiele) browser. Je bent voortvluchtig in een Hollands polderlandschap en moet 5 minuten uit handen blijven van de jagers. Regelmatig wordt je locatie met ze gedeeld.

Eigen game, geïnspireerd op het jachtconcept. Niet gelieerd aan StukTV of Videoland.

## Spelen

Online: **https://rvd-gmpplus.github.io/voortvluchtig/**

Geeft de link een 404, dan staat GitHub Pages nog uit; zie [Publiceren](#publiceren).

Lokaal: open `index.html` in een browser, of draai `npm start` en ga naar http://localhost:8080/. Er is geen installatie of build-stap nodig om te spelen.

Werkt op mobiel (touch) en desktop (toetsenbord en muis).

## Spelregels

- Blijf 5:00 minuten uit handen van de jagers. Word je aangetikt of aangereden, dan ben je gepakt.
- Je positie wordt regelmatig gedeeld (op Normaal elke 45 seconden). De jagers kennen ook je droppunt.
- Jagers rijden in zwarte auto's en kunnen alleen over wegen. Dichtbij stappen ze uit en zoeken ze te voet.
- Sloten oversteken is traag, maar auto's kunnen er niet langs.
- Buk bij een struik om vrijwel onzichtbaar te worden. Een boomstam tussen jou en een jager breekt het zicht.
- Sprinten kost conditie. Is die op, dan kun je pas weer sprinten als je bent bijgekomen (de balk kleurt rood).
- Een fiets is sneller en kost geen conditie. Je valt er wel meer mee op.
- Een energiedrank geeft volle conditie en een korte snelheidsboost.

### Moeilijkheid

Kies het niveau op het startscherm. Je keuze en je record per niveau worden in je browser onthouden.

| Niveau | Jagers | Snelheid jagers | Locatiedeling | Struiken |
|---|---|---|---|---|
| Makkelijk | één minder | x 0,9 | elke 56 s | dubbel zoveel |
| Normaal | 3 | x 1 | elke 45 s | 44 |
| Moeilijk | 3 | x 1,1 | elke 36 s | 44 |

De niveaus werken als factoren op `CFG` (zie `DIFF` in `index.html`). Pas je `CFG` aan, dan schuiven alle niveaus mee; Normaal is precies `CFG`.

## Besturing

| Actie | Mobiel | Desktop |
|---|---|---|
| Lopen | Joystick op de linkerhelft | WASD of pijltjestoetsen (werkt ook op AZERTY) |
| Camera | Vegen op de rechterhelft | Muis slepen, scrollen om te zoomen |
| Sprinten | Knop rechtsonder (vasthouden) | Shift |
| Bukken | Knop rechtsonder | C |
| Fiets op of af | Knop rechtsonder | E |
| Pauze | Knop linksboven | P of Esc |
| Geluid aan/uit | In het pauzescherm | M |
| Starten/opnieuw | Knop | Enter |

Het spel pauzeert vanzelf als je van tabblad of app wisselt. Het pauzescherm toont ook de beeldsnelheid (fps).

## Balans aanpassen

Alle balanswaarden staan in het `CFG`-object bovenaan het script in `index.html`.

| Sleutel | Eenheid | Wat het doet |
|---|---|---|
| `surviveTime` | s | Hoe lang je moet overleven om te winnen |
| `pingInterval` | s | Tijd tussen locatiedelingen (x factor per niveau) |
| `mapHalf` | m | Schaal van de minikaart (-480 tot 480) |
| `worldEdge` | m | Speelgrens voor speler en jagers (-470 tot 470) |
| `roads`, `canals` | m | Posities van wegen en sloten, op beide assen |
| `walk`, `sprint`, `crouch`, `bike` | m/s | Snelheden van de speler |
| `waterMul` | factor | Snelheid in een sloot, voor speler en jagers te voet |
| `carSpeed`, `footSpeed` | m/s | Snelheid van jagers in de auto en te voet (x factor per niveau) |
| `seeCar`, `seeFoot` | m | Zichtafstand van jagers vanuit de auto en te voet |
| `seeHidden` | m | Zichtafstand als je gebukt bij een struik zit |
| `bikePenalty` | m | Extra zichtafstand als je fietst |
| `catchR` | m | Vangafstand van een jager te voet |
| `carCatchR` | m | Vangafstand van een auto (aangereden) |
| `exitDist` | m | Binnen deze afstand van je laatst bekende positie stappen jagers uit |
| `intelFreshDrive` | s | Zo lang rijden jagers nog naar een gedeelde of geziene positie |
| `intelLive` | s | Zo lang geldt een waarneming voor jagers te voet als live |
| `stamMax`, `stamDrain`, `stamRegen` | punten, per s | Conditie: maximum, verbruik bij sprinten, herstel |
| `stamRecover` | punten | Na uitputting kun je pas weer sprinten vanaf deze conditie |
| `hunters` | aantal | Jagers op Normaal (er zijn 3 spawnpunten) |
| `bushCount` | aantal | Struiken op Normaal |

De veilige manier om de balans aan te passen, zonder lokale installatie:

1. Open `index.html` op GitHub en klik op het potlood.
2. Pas de waarde in `CFG` aan.
3. Kies bij het opslaan **Create a new branch and start a pull request**.
4. Wacht tot de check **Pages / test** groen is. In de samenvatting van die run staat een balanstabel: hoe vaak een bot wint en hoe lang die het volhoudt, per niveau.
5. Merge. De game staat een paar minuten later live.

Een wijziging die het spel onspeelbaar maakt (een niveau dat nooit of altijd te winnen is, of Makkelijk, Normaal en Moeilijk in de verkeerde volgorde) houdt de test tegen. Een gewone verschuiving levert alleen een waarschuwing op; werk dan `tests/balance.json` bij met de nieuwe waarden.

## Publiceren

De workflow `.github/workflows/pages.yml` test de game en publiceert daarna precies de geteste bestanden op GitHub Pages. Na het publiceren controleert hij of de live site echt de nieuwe versie serveert (`versie.txt`).

Pages aanzetten, eenmalig:

1. Ga naar **Settings > Pages > Build and deployment > Source** en kies **GitHub Actions**.
2. Ga naar **Actions > Pages > Run workflow** en start de workflow op `main`. Sla je dit over, dan publiceert de wekelijkse run op maandag het alsnog.

Kies niet **Deploy from a branch**. Dan publiceert GitHub de repo zonder de tests, en wordt de deploy-job bewust rood met een melding.

De workflow draait bij elke push naar `main`, bij elke pull request (alleen testen), met de hand, en elke maandag. Dependabot biedt maandelijks updates van de gebruikte actions en van Playwright aan als pull request; merge die als de test groen is.

## Ontwikkelen en testen

```bash
npm ci            # installeert Playwright (alleen voor de tests)
npm run setup     # installeert Chromium, WebKit en Firefox voor Playwright
npm test          # alle tests
npm run test:snel # alleen desktop-Chromium
npm start         # speel lokaal op http://localhost:8080/
```

Heb je al een Chromium, dan kun je `npm run setup` overslaan en `PW_CHROMIUM_PATH=/pad/naar/chrome` meegeven (alleen voor de Chromium-projecten).

De tests draaien in Chromium (desktop en Android-emulatie), WebKit (iPhone-emulatie) en Firefox, met software-WebGL. Ze dekken onder meer: laden zonder fouten en zonder externe verzoeken, lopen en sprinten, pauze, winnen en verliezen, jagers die om huizen heen lopen, de camera bij muren, de foutschermen, de moeilijkheid, het tekenbudget en de balans (`tests/balance.spec.js`, met bots op 12 vaste kaarten).

Wat de tests niet dekken: echte telefoons en hun GPU's, en echte spelers. Speel na een grote wijziging zelf een potje op je telefoon; het pauzescherm toont de fps.

Andere hulpmiddelen:

- `npm run site` stelt `_site` samen, precies wat er op Pages komt.
- `npm run og-image` maakt `og-image.png` opnieuw, de afbeelding die chat-apps bij een gedeelde link tonen.

## Techniek

Eén zelfstandig HTML-bestand met Three.js r128, lokaal meegeleverd in `vendor/` (geen externe verzoeken). Geluid wordt live gegenereerd met de Web Audio API. Bomen en struiken zijn instanced meshes; de hele kaart in beeld kost ongeveer 130 tekenaanroepen.

## Probleem melden

Werkt iets niet? [Open een issue](https://github.com/rvd-gmpplus/voortvluchtig/issues/new?template=probleem.yml). Het foutscherm in het spel heeft een link die je browser en de foutmelding al invult.

## Credits en licenties

- [Three.js](https://threejs.org/) r128, MIT-licentie, zie `vendor/three.LICENSE.txt`.
- Voor de game zelf is geen licentie opgegeven; alle rechten zijn voorbehouden aan de maker.
