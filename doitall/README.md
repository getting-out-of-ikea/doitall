# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.17.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" tailwindcss="plugins:typography,forms" --install npm doitall
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Deploy su Vercel

Il progetto usa `@sveltejs/adapter-vercel` con runtime `nodejs22.x` (necessario per `livekit-server-sdk`).

### 1. Collega il repository

1. Vai su https://vercel.com/new e importa il repo Git.
2. **Root Directory**: `doitall` (il progetto SvelteKit è in questa sottocartella).
3. Framework preset: **SvelteKit** (rilevato automaticamente).
4. Build Command: `npm run build` — Output Directory: lasciare vuoto (lo gestisce l'adapter).

### 2. Variabili d'ambiente

Imposta in *Project Settings → Environment Variables* (per Production, Preview e Development):

| Nome | Scope | Note |
|------|-------|------|
| `PUBLIC_SUPABASE_URL` | Public | URL del progetto Supabase |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | anon/publishable key |
| `LIVEKIT_URL` | Server | `wss://<project>.livekit.cloud` |
| `LIVEKIT_API_KEY` | Server | da LiveKit Cloud |
| `LIVEKIT_API_SECRET` | Server | da LiveKit Cloud |
| `PUBLIC_LIVEKIT_URL` | Public | stesso valore di `LIVEKIT_URL` (usato dal client) |

`SUPABASE_SECRET` non è necessario: l'app usa Supabase solo per l'auth e verifica i token con `getUser()`.

### 3. Supabase Auth — URL di redirect

Nel dashboard Supabase → *Authentication → URL Configuration*:

- **Site URL**: `https://<tuo-progetto>.vercel.app`
- **Redirect URLs**: aggiungi `https://<tuo-progetto>.vercel.app/**` e `http://localhost:5173/**`.

### 4. Deploy

```sh
# prima volta
npm i -g vercel
vercel link
vercel env pull .env.local   # opzionale, per testare in locale con le env di Vercel
vercel --prod
```

Oppure fai push su `main`: Vercel esegue il deploy automaticamente.

### 5. Verifica post-deploy

- `GET /` → redirect a `/login` se non autenticato.
- Login → home protetta.
- `POST /api/livekit/token` con `{ "room": "test" }` → `{ token, url }` (401 senza sessione).
- Apri `/call/test` in due browser con utenti diversi → audio/video bidirezionali.

### Note

- `vercel.json` fissa la region `fra1` (Francoforte) e limita il token endpoint a 512 MB / 10 s.
- Se in futuro si passa a runtime Edge, sostituire `livekit-server-sdk` con `jose` per firmare il JWT.
- LiveKit Cloud free tier **non** include Egress (registrazione server-side): la registrazione è client-side via `MediaRecorder`.
