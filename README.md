# JHH2.0

En enkel second brain på norsk, tilpasset mobil og PC.

## Kjør lokalt

Krever Node.js 22 eller nyere. Ingen pakker må installeres.

```sh
npm start
```

Åpne applikasjonen på port 3000. Sett `PORT` for en annen port.

```sh
npm run check
```

Notater lagres i nettleserens localStorage. De synkroniseres ikke mellom enheter. Bruk eksport/import for sikkerhetskopi og manuell overføring. Sletting av nettleserdata sletter lokale notater. Denne prototypen har ingen innlogging eller serverlagring og er ikke klar for sensitive jobbopplysninger. Innlogging og sikker synkronisering er neste utviklingstrinn.
