# Samsvarserklæring

En enkel webapp der håndverkere lager en **samsvarserklæring (egenerklæring)** for våtroms- og flisarbeid og sender den som PDF til kunden.

*A simple web app where tradespeople create a self-declaration of conformity for wet-room and tiling work in Norway, and send it to the customer as a PDF.*

**Åpne appen:** https://andreasfadum.github.io/samsvarserklaering/

- Sju språk: norsk (bokmål), engelsk, polsk, rumensk, litauisk, latvisk og estisk.
- Forklaring per punkt med lenker til kildene (TEK17 § 13-15, DiBK, håndverkertjenesteloven, SAK10, FEL).
- Ingen server. Alt du skriver, blir på enheten (localStorage). PDF-en lages i nettleseren.
- Firmaprofilen fylles inn første gang og brukes i alle senere erklæringer.

**Viktig:** Dette er en frivillig egenerklæring om eget arbeid. Den er ikke juridisk rådgivning og erstatter ikke samsvarserklæring med ansvarsrett i byggesaker (SAK10 § 12-4). Oversettelsene er ikke kontrollert av morsmålsbrukere ennå.

Kjøre lokalt: `python3 -m http.server 8765` i mappa, og åpne http://localhost:8765.
