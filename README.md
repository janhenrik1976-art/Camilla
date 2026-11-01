# JHH2.0

Norsk second brain for mobil og PC. Lokale notater fungerer uten konto. Supabase gir e-post/passord-innlogging og private notater som kan åpnes fra flere enheter.

## Utvikling

Node.js 22 eller nyere:

```sh
npm ci
npm run build
npm start
```

Appen kjører på port 3000 (`PORT` kan overstyre). Kjør bygg igjen etter kildekodeendringer. Netlify bygger automatisk med `npm run build` og publiserer bare `dist/`.

```sh
npm run check
npx playwright install chromium
npm test
```

For en eksisterende Chromium-installasjon: sett `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` til programfilen. Nettlesertestene simulerer Supabase og bekrefter ikke sikkerhetsregler i en virkelig database.

## Supabase: engangsoppsett før publisering

1. Sett prosjektets offentlige URL i `src/config.js`. Publishable key er offentlig nettleserkonfigurasjon. Bruk aldri secret/service_role eller databasepassord i appen.
2. Kjør `supabase/setup.sql` i Supabase SQL Editor. Skriptet oppretter notattabell, rettigheter og RLS-regler som kun tillater egne rader. Anonyme brukere får ingen notattilgang. Ikke slå av RLS.
3. I Authentication → URL Configuration: sett Site URL til `https://jhh2-0.netlify.app`, og legg samme adresse til Redirect URLs. Bruk kun faktiske appadresser.
4. Behold e-postbekreftelse på. Opprett konto fra appen, bekreft e-posten og logg inn. Standard e-posttjeneste har utsendelsesgrenser; ved større bruk må egen SMTP settes opp.
5. Verifiser med to testkontoer: A oppretter notat; A ser samme notat på en annen enhet. B skal ikke se, endre eller slette As notat, heller ikke ved direkte API-kall. Logget ut skal API ikke gi notattilgang.

Databaseoppsett og autentisering må verifiseres mot den faktiske Supabase-instansen før skyfunksjonene kan regnes som klare.

## Lagring og overføring

Eksisterende notater i `jhh2.notes.v1` beholdes lokalt. Innlogging viser bare kontoens notater. «Kopier lokale notater til kontoen» overfører dem uttrykkelig uten å fjerne den lokale kopien. Gjentatt kopiering bruker samme ID og overskriver ikke eksisterende skynotater. Utlogging viser lokale notater igjen. Eksport/import gir JSON-sikkerhetskopi; gjentatt filimport til skyen oppretter nye kopier.

Skynotater lagres først når serveren bekrefter det. Ingen frakoblet skyredigering eller automatisk offline-kø. Synkronisering skjer ved innlogging, når appen vises, manuelt og hvert minutt når den er synlig. Åpne redigeringsvinduer oppdateres ikke automatisk. Versjonskontroll hindrer stille overskriving av et notat endret fra en annen enhet. Ved konflikt beholdes teksten i editoren slik at den kan kopieres før oppdatering.

Lokale notater og innloggingsøkten ligger i nettleserlagringen. Bruk skjermlås på delte enheter og logg ut når du er ferdig. Avklar arbeidsgivers krav før jobbdata lagres.

## Oppgaver og festede notater

Kjør `supabase/tasks-and-pins.sql` i SQL Editor, også etter førstegangsoppsettet. Skriptet legger til to felt med standardverdier og validering av oppgavelister. Eksisterende notatinnhold og tilgangsregler beholdes. Før skriptet er kjørt fungerer vanlige skynotater fortsatt; nye kontroller er deaktivert med forklaring. Trykk «Oppdater notater» etter databaseoppdateringen.

Åpne et notat, velg «Fest dette notatet øverst» og/eller legg til oppgaver. Kryss av fullførte oppgaver og trykk «Lagre notat». Lukking uten lagring forkaster endringene. Festede notater sorteres først i hvert område og i søkeresultater. Søk omfatter også oppgavetekst. Oppgaver og festing inngår i eksport/import og følger kontoens synkronisering og konfliktkontroll.
