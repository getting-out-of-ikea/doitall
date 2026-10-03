import { json, error } from '@sveltejs/kit';
import { AccessToken } from 'livekit-server-sdk';
import { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '$env/static/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

const ROOM_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	if (!user) {
		error(401, 'Unauthorized');
	}

	let body: { room?: unknown };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const room = typeof body.room === 'string' ? body.room : '';
	if (!ROOM_PATTERN.test(room)) {
		error(400, 'Invalid room name');
	}

	if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
		error(500, 'LiveKit credentials are not configured');
	}

	// Never trust a client-supplied identity: bind it to the authenticated user.
	const identity = user.id;

	const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
		identity,
		name: user.email ?? identity,
		ttl: '2h'
	});

	token.addGrant({
		roomJoin: true,
		room,
		canPublish: true,
		canSubscribe: true,
		canPublishData: true
	});

	const jwt = await token.toJwt();

	return json({
		token: jwt,
		url: publicEnv.PUBLIC_LIVEKIT_URL || LIVEKIT_URL
	});
};
