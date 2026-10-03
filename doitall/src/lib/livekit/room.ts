import {
	Room,
	RoomEvent,
	Track,
	type LocalTrackPublication,
	type Participant,
	type RemoteParticipant,
	type RemoteTrack,
	type RemoteTrackPublication,
	type RoomOptions
} from 'livekit-client';
import { fetchToken } from './token';

export interface CallSession {
	room: Room;
	disconnect: () => Promise<void>;
}

const DEFAULT_OPTIONS: RoomOptions = {
	adaptiveStream: true,
	dynacast: true
};

/**
 * Connect to a LiveKit room using a server-issued token.
 * The token identity is bound to the authenticated Supabase user server-side.
 */
export async function connect(roomName: string, options: RoomOptions = {}): Promise<CallSession> {
	const { token, url } = await fetchToken(roomName);

	const room = new Room({ ...DEFAULT_OPTIONS, ...options });

	await room.connect(url, token);

	// Publish local camera + microphone by default. Failures (e.g. denied
	// permissions) are non-fatal: the user can still join and enable later.
	await room.localParticipant.enableCameraAndMicrophone().catch(() => undefined);

	return {
		room,
		disconnect: async () => {
			await room.disconnect();
		}
	};
}

export function isScreenShare(track: RemoteTrack | LocalTrackPublication): boolean {
	if ('source' in track) {
		return track.source === Track.Source.ScreenShare;
	}
	return false;
}

export type { Participant, RemoteParticipant, RemoteTrack, RemoteTrackPublication };
export { Room, RoomEvent, Track };
