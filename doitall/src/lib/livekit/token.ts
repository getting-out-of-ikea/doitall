export interface LiveKitTokenResponse {
	token: string;
	url: string;
}

/**
 * Request a LiveKit access token for the given room from the server.
 * The server binds the token identity to the authenticated Supabase user.
 */
export async function fetchToken(room: string): Promise<LiveKitTokenResponse> {
	const response = await fetch('/api/livekit/token', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ room })
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || `Failed to fetch token (${response.status})`);
	}

	return (await response.json()) as LiveKitTokenResponse;
}
