npm -prefix doitall run dev
npm -prefix doitall run check

# Video App

App web di videocomunicazione: autenticazione con Supabase, video/audio in tempo reale con LiveKit, interfaccia SvelteKit + Tailwind.

## Stack

| Ambito | Tecnologia |
|---|---|
| Frontend / backend | SvelteKit (Svelte 5, runes) |
| Styling | Tailwind CSS 4 |
| Autenticazione | Supabase (email + password) |
| Video / audio / dati | LiveKit |
| Deploy | Vercel |

## Requisiti

- Node.js `^20.19` oppure `^22.13` oppure `>=24`

## Struttura del repository

- `webapp/` — applicazione SvelteKit (Root Directory su Vercel)
- `piano.md` — piano di implementazione per fasi
- `.env.example` — elenco delle variabili d'ambiente richieste

## Configurazione

1. Crea il file `webapp/.env` con i valori indicati in `.env.example`:

   - `PUBLIC_SUPABASE_URL` — URL del progetto Supabase
   - `PUBLIC_SUPABASE_PUBLISHABLE_KEY` — chiave pubblica Supabase
   - `PUBLIC_LIVEKIT_URL` — URL `wss://…` del progetto LiveKit Cloud
   - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — credenziali server-side LiveKit

2. Installa le dipendenze e avvia il dev server:

   ```sh
   cd webapp
   npm install
   npm run dev
   ```

## Come funziona

- **Auth** — `webapp/src/hooks.server.ts` crea il client Supabase, legge la sessione dai cookie e popola `locals.user`. Le rotte diverse da `/login`, `/auth/*` e `/logout` richiedono una sessione; gli endpoint sotto `/api/` gestiscono l'autenticazione da soli (401).
- **Token LiveKit** — `POST /api/livekit/token` verifica l'utente, valida il nome della stanza e restituisce `{ token, url }`. L'`identity` del partecipante è sempre l'id utente Supabase, mai un valore inviato dal client.
- **Stanze** — `/rooms` è la lobby (nome stanza esistente oppure stanza casuale), mentre `/rooms/[roomId]` e `/call/[roomId]` riusano lo stesso componente di chiamata.

## Comandi

```sh
cd webapp

npm run dev      # dev server
npm run check    # type check (svelte-check)
npm run lint     # prettier + eslint
npm run test     # unit test (vitest)
npm run build    # build di produzione
```

## Deploy

Istruzioni dettagliate in [`webapp/README.md`](webapp/README.md).
