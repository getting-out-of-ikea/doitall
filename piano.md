# Piano di implementazione — App di videocomunicazione

Stack: **SvelteKit** + **Supabase (auth)** + **LiveKit (video)** + **Vercel (deploy)**

Obiettivo: app web con autenticazione, chiamate 1‑to‑1 e stanze multi‑partecipante, con tutte le feature offerte da LiveKit Cloud free tier (screen share, chat testuale via data channel, mute/camera toggle, ecc.). Supabase usato **solo** per l'autenticazione (niente tabelle applicative, niente storage).

---

## 0. Convenzioni per l'uso con aider

- Ogni fase elenca i **file da creare/modificare** e i **prompt suggeriti** da dare ad aider.
- Un commit git per ogni step completato (aider li gestisce con `/commit`).
- Prima di ogni modifica: `aider <file1> <file2> ...` per limitare il contesto.
- Eseguire dopo ogni fase:
  - `npm run check`
  - `npm run lint`
  - `npm run test` (dove applicabile)

---

## 1. Prerequisiti (manuale, fuori aider)

1. **LiveKit Cloud**: creare progetto su https://cloud.livekit.io → recuperare `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
2. **Supabase**: creare progetto su https://supabase.com → nel dashboard, Authentication:
   - Abilitare provider **Email/Password** (e opzionalmente **Google OAuth**).
   - Impostare Site URL e Redirect URLs con URL Vercel + `http://localhost:5173`.
   - Recuperare `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - `SUPABASE_SECRET` **non serve** in questa fase (solo auth lato client + verify token server-side con `getUser()`).
3. **Vercel**: collegare il repo, aggiungere le env vars (tutte quelle in `.env.example`).
4. **`.env` locale**: copiare `.env.example` e riempire i valori.

---

## 2. Fase 1 — Rimozione demo e pulizia

**File coinvolti**
- eliminare: `webapp/src/routes/demo/+page.svelte`
- eliminare: `webapp/src/routes/demo/playwright/+page.svelte`
- eliminare: `webapp/src/routes/demo/playwright/page.svelte.e2e.ts`
- eliminare (se non serve): `webapp/playwright.config.ts`
- modificare: `webapp/package.json` (rimuovere `test:e2e`, `@playwright/test`, `playwright` se non si manterrà Playwright)

**Prompt aider**
> Rimuovi la cartella `src/routes/demo` e le dipendenze/scripts Playwright non più utilizzate. Aggiorna `package.json` di conseguenza e sistema eventuali import rotti. Mantieni `@vitest/browser-playwright` solo per i test unit in browser.

**Verifica**: `npm run check && npm run test:unit -- --run`.

---

## 3. Fase 2 — Integrazione Supabase (auth)

**File da creare**
- `webapp/src/lib/supabase/client.ts` — `createClient` con `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `webapp/src/lib/supabase/helpers.ts` — wrapper: `signIn`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`.
- `webapp/src/routes/(auth)/login/+page.svelte` — form login/registrazione (email + password).
- `webapp/src/routes/(auth)/logout/+server.ts` (opzionale) — sign out lato server se serve.
- `webapp/src/hooks.server.ts` — popolare `event.locals.supabase` e `event.locals.user` a partire dai cookie; **non** bloccare `/login` e `/auth/*`.
- `webapp/src/app.d.ts` — estendere `App.Locals` con `supabase` e `user`.
- `webapp/src/routes/+layout.server.ts` — esporre `user` a tutta l'app.

**File da modificare**
- `webapp/package.json` — aggiungere `@supabase/ssr` e `@supabase/supabase-js`.
- `webapp/src/routes/+layout.svelte` — mostrare in header stato login + bottone logout.
- `webapp/src/routes/+page.svelte` — rendere la home protetta o reindirizzare a `/login` se non loggato.

**Prompt aider (step separati)**
1. > Aggiungi `@supabase/ssr` e `@supabase/supabase-js`. Crea `src/lib/supabase/client.ts` e `src/hooks.server.ts` che usano i cookie per gestire la sessione Supabase, esponendo `event.locals.supabase` e `event.locals.user`.
2. > Crea `src/routes/(auth)/login/+page.svelte` con form email+password e toggle login/registrazione. Al successo redirigi a `/`.
3. > Aggiorna `src/app.d.ts` con `App.Locals` contenente `supabase` e `user`. Aggiorna `src/routes/+layout.server.ts` per passare `user` a tutte le pagine.
4. > Proteggi `src/routes/+page.svelte` e crea un layout `(app)` con redirect a `/login` se `!user`.

**Nota**: il token LiveKit lato server verifica l'utente chiamando `locals.supabase.auth.getUser()`.

---

## 4. Fase 3 — Endpoint token LiveKit (server-side)

**File da creare**
- `webapp/src/routes/api/livekit/token/+server.ts`
  - POST con body `{ room: string, identity?: string }`.
  - Verifica sessione con `locals.supabase.auth.getUser()`; 401 se assente.
  - Genera JWT con `livekit-server-sdk`: `AccessToken(apiKey, apiSecret, { identity, ttl: '2h' })`, `grant.roomJoin = true`, `grant.room = room`, `canPublish`, `canSubscribe`, `canPublishData`.
  - Ritorna `{ token, url: LIVEKIT_URL }`.
- `webapp/src/lib/livekit/token.ts` (opzionale) — client helper `fetchToken(room)`.

**File da modificare**
- `webapp/package.json` — aggiungere `livekit-server-sdk`, `livekit-client`.
- `webapp/vite.config.ts` — se serve, `optimizeDeps.exclude: ['livekit-client']` (spesso necessario per SvelteKit).

**Prompt aider**
> Crea l'endpoint POST `/api/livekit/token` che verifica l'utente Supabase, genera un JWT `livekit-server-sdk` con grant `roomJoin`, `canPublish`, `canSubscribe`, `canPublishData` per la stanza passata e restituisce `{ token, url }`. Leggi le env `LIVEKIT_*` con `$env/dynamic/private` (URL per il client: usa `PUBLIC_LIVEKIT_URL` o passa `url` al client via `$env/dynamic/public`).

**Nota su Vercel**: l'endpoint deve girare come **Node.js runtime** (default). Se in futuro si passa a edge, `livekit-server-sdk` va sostituito con `jose`.

---

## 5. Fase 4 — UI chiamata 1‑to‑1

**File da creare**
- `webapp/src/lib/livekit/room.ts` — helper per `Room`, `connect`, eventi, cleanup.
- `webapp/src/routes/(app)/call/[roomId]/+page.svelte` — pagina chiamata generica (usata sia per 1‑to‑1 che per stanze).
- `webapp/src/lib/components/VideoTile.svelte` — singolo tile video con nome e stato mute.
- `webapp/src/lib/components/ControlBar.svelte` — toggle microfono, camera, screen share, leave.
- `webapp/src/lib/components/Participants.svelte` — lista partecipanti.

**Prompt aider**
> Crea `src/lib/livekit/room.ts` con funzioni `connect(roomName)`, `disconnect()`, gestione eventi `ParticipantConnected/Disconnected`, `TrackSubscribed/Unsubscribed`, e `RoomEvent.LocalTrackPublished`. Aggiungi una pagina `/call/[roomId]` che chiede il token, si connette e renderizza i tile con `VideoTile.svelte` e i controlli in `ControlBar.svelte`. Usa `livekit-client`.

**Verifica manuale**: aprire due browser loggati con utenti diversi su `/call/sala-test`, verificare audio/video bidirezionali.

---

## 6. Fase 5 — Stanze multi‑partecipante e lobby

**File da creare**
- `webapp/src/routes/(app)/rooms/+page.svelte` — input nome stanza + "Crea/Entra".
- `webapp/src/routes/(app)/rooms/[roomId]/+page.svelte` — riusa il componente della Fase 4 (estrarre il core in `webapp/src/lib/components/CallView.svelte` e importarlo da entrambe le rotte).
- `webapp/src/lib/components/CallView.svelte` — componente riutilizzabile (connessione, tile grid responsive, controlli).

**Prompt aider**
> Estrai la logica di chiamata da `/call/[roomId]/+page.svelte` in un componente `CallView.svelte` e crea la rotta `/rooms/[roomId]` che lo riusa. Aggiungi `/rooms` con form per creare/entrare in una stanza (genera `roomId` con `crypto.randomUUID()` se non specificato). La griglia video deve adattarsi al numero di partecipanti (1, 2, 3‑4, 5+) con classi Tailwind.

---

## 7. Fase 6 — Feature LiveKit extra (free tier)

### 7.1 Screen sharing
- `ControlBar.svelte`: bottone che chiama `room.localParticipant.setScreenShareEnabled(true/false)`.
- Mostrare il track screen share in un tile dedicato in alto.

### 7.2 Chat testuale (data channel)
- `webapp/src/lib/livekit/chat.ts` — `sendChat`, subscribe a `RoomEvent.DataReceived` con `kind = 'chat'`.
- `webapp/src/lib/components/ChatPanel.svelte` — UI chat, mostrato come sidebar collassabile.
- Persistenza chat **solo in memoria** (Supabase non è usato per dati applicativi).

### 7.3 Reaction/emoji (data channel)
- Estensione di `chat.ts` con `kind = 'reaction'`; mostra overlay animate.

### 7.4 Active speaker / mute indicator
- Ascoltare `RoomEvent.ActiveSpeakersChanged` per bordo evidenziato.

### 7.5 Dispositivi (device switch)
- `ControlBar.svelte`: menu per selezionare mic/camera via `Room.getLocalDevices` + `switchActiveDevice`.

### 7.6 Registrazione (LiveKit Egress)
- LiveKit Cloud Egress è **a pagamento** oltre il free tier: **non incluso di default**.
- Opzione "gratis": registrazione **lato client** con `MediaRecorder` sul canvas composito (`RoomEvent.TrackSubscribed` → disegno su canvas → `captureStream`) salvando in locale con download. Documentare i limiti (qualità, no tracce separate).
- Se l'utente vuole Egress in futuro: endpoint `/api/livekit/egress` + storage S3.

### Prompt aider
> Aggiungi screen share (bottone + tile dedicato) e chat via data channel con un pannello laterale. Poi aggiungi switch dispositivi audio/video. Infine aggiungi una feature di registrazione lato client usando `MediaRecorder` su un canvas composito con download `.webm`, marcandola come best-effort.

---

## 8. Fase 7 — Qualità, sicurezza, deploy

**Sicurezza**
- `api/livekit/token`: rate limit semplice in-memory (o Upstash se Vercel serverless) + validazione `room` (regex).
- Vincolare `identity` = `user.id` Supabase (non accettare identity arbitraria dal client).
- CORS: solo same-origin.
- Token TTL breve (2h) + `roomJoin` limitato alla stanza richiesta.

**UX**
- Loading/error states per connessione LiveKit.
- Fallback "permessi negati" per mic/camera.
- Mobile responsive (Tailwind) e gestione orientamento.

**Vercel**
- Verificare `@sveltejs/adapter-vercel` (sostituire `adapter-auto` in `svelte.config`/`vite.config` se necessario).
- Variabili d'ambiente: `PUBLIC_SUPABASE_*`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, ed eventuale `PUBLIC_LIVEKIT_URL` per il client.
- `getUser()` su ogni richiesta token: assicurarsi che i cookie di sessione Supabase siano inoltrati.

**Test**
- Unit (vitest browser) per `VideoTile`, `ControlBar`, `ChatPanel`.
- E2E (Playwright, se mantenuto) per il flow: login → entra stanza → vede se stesso.

### Prompt aider
> Aggiungi validazione e rate limiting all'endpoint token, forza `identity = user.id`, e assicurati che `room` rispetti `^[a-zA-Z0-9_-]{1,64}$`. Passa il progetto a `adapter-vercel`. Aggiungi test vitest per `ControlBar.svelte` e `ChatPanel.svelte`.

---

## 9. Roadmap riassuntiva (ordine consigliato per aider)

| # | Fase | Deliverable |
|---|------|-------------|
| 1 | Pulizia demo | repo senza `demo/*` |
| 2 | Supabase auth | login/signup/logout + `locals.user` |
| 3 | Token LiveKit | endpoint `/api/livekit/token` |
| 4 | Chiamata base | `/call/[roomId]` funzionante 1‑to‑1 |
| 5 | Stanze | `/rooms` + `CallView` riusabile |
| 6 | Feature extra | screen share, chat, reactions, device switch, recording client-side |
| 7 | Hardening + Vercel | rate limit, adapter-vercel, test, deploy |

---

## 10. Note finali

- Supabase **non** è usato per persistenza applicativa: nessuna tabella custom, nessuna RLS da definire oltre auth.
- LiveKit Cloud free tier copre: stanze illimitate con limiti di minuti/partecipanti concorrenti; **esclude** Egress (registrazione server-side) e servizi avanzati (Transcription, Agents).
- Ogni fase è progettata per essere chiusa in un singolo giro aider con contesto limitato ai file elencati.
