import { error, json } from '@sveltejs/kit';
import { AccessToken } from 'livekit-server-sdk';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { isValidRoomId } from '$lib/livekit/room-id';
import { livekitTokenLimiter } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

/**
 * POST /api/livekit/token
 *
 * Genera un JWT LiveKit per la stanza richiesta. Hardening (Fase 7):
 * - autenticazione obbligatoria: nessun token anonimo;
 * - `identity` forzata a `user.id` Supabase, mai presa dal client;
 * - `room` validata con `isValidRoomId` (stessa regex della lobby `/rooms`);
 * - rate limit per utente (20 richieste/minuto) con `Retry-After`;
 * - richieste cross-origin rifiutate;
 * - `Cache-Control: no-store`, perché la risposta contiene un token.
 */
export const POST: RequestHandler = async ({ request, url, locals: { user } }) => {
	// `locals.user` è già validato in hooks.server.ts tramite supabase.auth.getUser().
	if (!user) {
		error(401, 'Non autenticato');
	}

	// CORS: solo same-origin. I browser possono omettere `Origin` su richieste
	// same-origin, quindi la sua assenza non è trattata come errore.
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) {
		error(403, 'Origine non consentita.');
	}

	const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = privateEnv;
	const livekitUrl = publicEnv.PUBLIC_LIVEKIT_URL;

	if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !livekitUrl) {
		error(
			500,
			'Configurazione LiveKit mancante: imposta LIVEKIT_API_KEY, LIVEKIT_API_SECRET e PUBLIC_LIVEKIT_URL.'
		);
	}

	const limit = livekitTokenLimiter.check(user.id);
	if (!limit.allowed) {
		const retryAfterSeconds = Math.max(1, Math.ceil(limit.retryAfterMs / 1000));
		return json(
			{ message: `Troppe richieste di token: riprova tra ${retryAfterSeconds} secondi.` },
			{ status: 429, headers: { 'retry-after': String(retryAfterSeconds) } }
		);
	}

	let body: unknown = null;
	try {
		body = await request.json();
	} catch {
		error(400, 'Body JSON non valido.');
	}

	// `body` può essere `null` o un tipo qualsiasi: niente accesso diretto a proprietà.
	const room = (body as { room?: unknown } | null)?.room ?? null;
	if (!isValidRoomId(room)) {
		error(400, 'Nome stanza non valido.');
	}

	// L'identity è vincolata all'utente Supabase: mai fidarsi del client.
	const accessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
		identity: user.id,
		name: user.email ?? user.id,
		ttl: '2h'
	});

	accessToken.addGrant({
		room,
		roomJoin: true,
		canPublish: true,
		canSubscribe: true,
		canPublishData: true
	});

	const token = await accessToken.toJwt();
	return json({ token, url: livekitUrl }, { headers: { 'cache-control': 'no-store' } });
};
