import { error, json } from '@sveltejs/kit';
import { AccessToken } from 'livekit-server-sdk';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

/**
 * Pattern ammesso per il nome della stanza: coincide con quello documentato in piano.md (Fase 7).
 * Evita path traversal / injection nel grant LiveKit.
 */
const ROOM_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	// `locals.user` è già validato in hooks.server.ts tramite supabase.auth.getUser().
	if (!user) {
		error(401, 'Non autenticato');
	}

	const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = privateEnv;
	const url = publicEnv.PUBLIC_LIVEKIT_URL;

	if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !url) {
		error(
			500,
			'Configurazione LiveKit mancante: imposta LIVEKIT_API_KEY, LIVEKIT_API_SECRET e PUBLIC_LIVEKIT_URL.'
		);
	}

	let payload: { room?: unknown };
	try {
		payload = await request.json();
	} catch {
		error(400, 'Body JSON non valido.');
	}

	const room = typeof payload.room === 'string' ? payload.room : '';
	if (!ROOM_ID_REGEX.test(room)) {
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
	return json({ token, url });
};
