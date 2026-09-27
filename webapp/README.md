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
npx sv@0.17.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:typography,forms" --install npm webapp
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

## Test

```sh
# type check + lint
npm run check
npm run lint

# unit test (vitest: progetto "client" in browser, progetto "server" in node)
npm run test
```

## Deploy su Vercel

1. Collega il repository a Vercel e imposta la **Root Directory** su `webapp`.
2. Aggiungi le variabili d'ambiente (vedi `.env.example`):
   - `PUBLIC_LIVEKIT_URL` — URL `wss://…` del progetto LiveKit Cloud
   - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — solo server-side
   - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET` non è usato in questa fase: si può omettere
3. Build command `npm run build`, install command `npm install`.

### Adapter

Il progetto usa `@sveltejs/adapter-auto`: su Vercel rileva la piattaforma e usa
`@sveltejs/adapter-vercel`. Se l'adapter specifico non è installato, la build
fallisce con un messaggio che indica quale pacchetto aggiungere. Per rendere la
scelta esplicita:

```sh
npm install -D @sveltejs/adapter-vercel
npm uninstall @sveltejs/adapter-auto
```

poi in `vite.config.ts`:

```ts
import adapter from '@sveltejs/adapter-vercel';
// ...
// adapter: adapter()
```

L'endpoint `/api/livekit/token` deve girare sul runtime **Node.js** (default su
Vercel): `livekit-server-sdk` non è compatibile con il runtime edge. Su edge
andrebbe sostituito con `jose` per la firma del JWT.

### Rate limiting

`src/lib/server/rate-limit.ts` limita le richieste di token per utente con un
token bucket **in memoria**: su serverless il contatore è per istanza, quindi il
limite è best-effort. Per un limite esatto e condiviso serve uno store esterno
(es. Upstash Redis).
