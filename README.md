# VOORTVLUCHTIG

3D ontsnappingsgame voor de (mobiele) browser. Je bent voortvluchtig in een Hollands polderlandschap en moet 5 minuten uit handen blijven van drie jagers. Elke 45 seconden wordt je locatie met ze gedeeld.

Eigen game, geïnspireerd op het jachtconcept. Niet gelieerd aan StukTV of Videoland.

## Spelen

Open `index.html` in een browser, of speel online via GitHub Pages van deze repo:
`https://<gebruikersnaam>.github.io/voortvluchtig/`

Werkt op mobiel (touch) en desktop (toetsenbord en muis). Geen installatie of build-stap nodig.

## Spelregels

- Blijf 5:00 minuten uit handen van de jagers. Word je aangetikt, dan ben je gepakt.
- Elke 45 seconden wordt je positie gedeeld. De jagers kennen ook je droppunt.
- Jagers rijden in zwarte SUV's en kunnen alleen over wegen. Dichtbij stappen ze uit en zoeken ze te voet.
- Sloten oversteken is traag, maar auto's kunnen er niet langs.
- Buk bij een struik om vrijwel onzichtbaar te worden.
- Een fiets is sneller en kost geen conditie. Je valt er wel meer mee op.
- Een energiedrank geeft volle conditie en een korte snelheidsboost.

## Besturing

| Actie | Mobiel | Desktop |
|---|---|---|
| Lopen | Joystick op de linkerhelft | WASD of pijltjestoetsen |
| Camera | Vegen op de rechterhelft | Muis slepen, scrollen om te zoomen |
| Sprinten | Knop rechtsonder (vasthouden) | Shift |
| Bukken | Knop rechtsonder | C |
| Fiets op of af | Knop rechtsonder | E |

## Techniek

Eén zelfstandig HTML-bestand met Three.js r128 via cdnjs. Geluid wordt live gegenereerd met de Web Audio API.

Alle balanswaarden staan in het `CFG`-object bovenaan het script: speelduur, ping-interval, snelheden van speler en jagers, zichtafstanden en conditie. Aanpassen, opslaan en de pagina herladen is genoeg.
