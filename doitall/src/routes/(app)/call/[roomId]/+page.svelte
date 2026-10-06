<script lang="ts">
	import { page } from '$app/state';
	import {
		connect,
		RoomEvent,
		Track,
		type CallSession,
		type Participant,
		type RemoteParticipant,
		type RemoteTrack,
		type RemoteTrackPublication
	} from '$lib/livekit/room';
	import VideoTile from '$lib/components/VideoTile.svelte';
	import ControlBar from '$lib/components/ControlBar.svelte';
	import Participants from '$lib/components/Participants.svelte';

	const roomId = $derived(page.params.roomId);

	let session: CallSession | null = $state(null);
	let status = $state<'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'>('idle');
	let errorMessage = $state<string | null>(null);
	let participants = $state<Participant[]>([]);
	let canPlaybackAudio = $state(true);
	let remoteScreenShare = $state<{
		participant: RemoteParticipant;
		publication: RemoteTrackPublication;
	} | null>(null);

	// Pre-join preview: shown while the user hasn't pressed "Join call" yet.
	let previewStream = $state<MediaStream | null>(null);
	let previewError = $state<string | null>(null);
	let previewVideoEl: HTMLVideoElement | undefined = $state();

	// Reactive trigger for the connection effect below. It only ever flips from
	// false → true, so the connect effect runs exactly once per mount.
	let hasStarted = $state(false);

	function refreshParticipants() {
		if (!session) return;
		participants = [session.room.localParticipant, ...session.room.remoteParticipants.values()];
	}

	// Non-reactive variant used inside the connect effect so that reading the
	// reactive `session` state does not become an effect dependency.
	function refreshFrom(s: CallSession) {
		participants = [s.room.localParticipant, ...s.room.remoteParticipants.values()];
	}

	function handleTrackSubscribed(
		track: RemoteTrack,
		publication: RemoteTrackPublication,
		participant: RemoteParticipant
	) {
		if (track.source === Track.Source.ScreenShare) {
			remoteScreenShare = { participant, publication };
		}
	}

	function handleTrackUnsubscribed(
		_track: RemoteTrack,
		publication: RemoteTrackPublication,
		participant: RemoteParticipant
	) {
		if (
			remoteScreenShare?.publication === publication &&
			remoteScreenShare.participant === participant
		) {
			remoteScreenShare = null;
		}
	}

	async function enableAudio() {
		if (!session) return;
		await session.room.startAudio();
		canPlaybackAudio = session.room.canPlaybackAudio;
	}

	function startCall() {
		if (hasStarted) return;
		hasStarted = true;
	}

	// While idle, request the local camera/mic and show a preview. The stream is
	// stopped when the user joins (or when the page is left) so LiveKit can take
	// over the devices cleanly.
	$effect(() => {
		if (hasStarted) return;

		let cancelled = false;
		let localStream: MediaStream | null = null;

		navigator.mediaDevices
			.getUserMedia({ video: true, audio: true })
			.then((stream) => {
				if (cancelled) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				localStream = stream;
				previewStream = stream;
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				previewError =
					err instanceof Error ? err.message : 'Could not access camera or microphone';
			});

		return () => {
			cancelled = true;
			if (localStream) {
				localStream.getTracks().forEach((t) => t.stop());
			}
			previewStream = null;
		};
	});

	// Attach the preview stream to the <video> element.
	$effect(() => {
		const el = previewVideoEl;
		const stream = previewStream;
		if (!el || !stream) return;
		el.srcObject = stream;
		return () => {
			el.srcObject = null;
		};
	});

	$effect(() => {
		if (!hasStarted) return;

		const name = roomId;
		if (!name) return;

		let cancelled = false;
		// Track the connection locally so the cleanup does NOT read the reactive
		// `session` state. Reading `session` here would make it a dependency of
		// this effect, causing the effect to re-run (and tear down the room)
		// every time `session` is assigned — which corrupts the connection for
		// the already-present participant when someone else joins/reloads.
		let current: CallSession | null = null;

		status = 'connecting';
		errorMessage = null;
		canPlaybackAudio = true;

		connect(name)
			.then((s) => {
				if (cancelled) {
					void s.disconnect();
					return;
				}
				current = s;
				session = s;
				status = 'connected';
				canPlaybackAudio = s.room.canPlaybackAudio;

				s.room
					.on(RoomEvent.ParticipantConnected, refreshParticipants)
					.on(RoomEvent.ParticipantDisconnected, refreshParticipants)
					.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
					.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
					.on(RoomEvent.AudioPlaybackStatusChanged, () => {
						canPlaybackAudio = s.room.canPlaybackAudio;
					})
					.on(RoomEvent.Disconnected, () => {
						status = 'disconnected';
					});

				refreshFrom(s);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				status = 'error';
				errorMessage = err instanceof Error ? err.message : 'Failed to connect';
			});

		return () => {
			cancelled = true;
			if (current) {
				void current.disconnect();
				current = null;
			}
			session = null;
		};
	});

	async function leave() {
		if (session) {
			await session.disconnect();
			session = null;
		}
		status = 'disconnected';
	}
</script>

<svelte:head><title>Call · {roomId}</title></svelte:head>

<div class="flex h-[calc(100vh-57px)] flex-col">
	{#if status === 'idle'}
		<div class="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-900 p-6">
			<div class="w-full max-w-lg">
				<h2 class="mb-3 text-center text-lg font-medium text-white">Ready to join?</h2>

				<div class="overflow-hidden rounded-lg bg-black shadow-lg">
					<video
						bind:this={previewVideoEl}
						class="aspect-video w-full object-cover"
						autoplay
						playsinline
						muted
					></video>
				</div>

				{#if previewError}
					<p class="mt-3 text-center text-sm text-red-400">{previewError}</p>
				{/if}

				<button
					type="button"
					onclick={startCall}
					class="mt-6 w-full rounded-full bg-green-600 px-6 py-3 text-base font-medium text-white hover:bg-green-700"
				>
					Join call
				</button>

				<p class="mt-3 text-center text-xs text-gray-400">Room: {roomId}</p>
			</div>
		</div>
	{:else if status === 'connecting'}
		<div class="flex flex-1 items-center justify-center text-gray-500">Connecting…</div>
	{:else if status === 'error'}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 text-red-600">
			<p>Could not join the call.</p>
			<p class="text-sm text-gray-500">{errorMessage}</p>
			<a href="/" class="text-sm text-blue-600 hover:underline">Back to home</a>
		</div>
	{:else if status === 'disconnected'}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 text-gray-600">
			<p>You left the call.</p>
			<a href="/" class="text-sm text-blue-600 hover:underline">Back to home</a>
		</div>
	{:else if session}
		{#if !canPlaybackAudio}
			<div
				class="flex items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-900"
				data-testid="audio-blocked-banner"
			>
				<span>The browser blocked audio playback.</span>
				<button
					type="button"
					onclick={enableAudio}
					class="rounded-md bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
				>
					Enable audio
				</button>
			</div>
		{/if}

		<div class="flex flex-1 overflow-hidden">
			<div class="flex flex-1 flex-col overflow-hidden">
				{#if remoteScreenShare}
					<div class="h-1/2 border-b border-gray-200 bg-black">
						<VideoTile
							participant={remoteScreenShare.participant}
							publication={remoteScreenShare.publication}
						/>
					</div>
				{/if}

				<div
					class="grid flex-1 auto-rows-fr grid-cols-1 gap-2 overflow-auto bg-gray-100 p-2 sm:grid-cols-2"
				>
					{#each participants as participant (participant.identity)}
						<VideoTile
							{participant}
							isLocal={participant === session.room.localParticipant}
						/>
					{/each}
				</div>
			</div>

			<Participants {participants} />
		</div>

		<ControlBar room={session.room} onLeave={leave} />
	{/if}
</div>
