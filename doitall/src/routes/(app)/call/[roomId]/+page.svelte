<script lang="ts">
	import { onDestroy } from 'svelte';
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
	let status = $state<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
	let errorMessage = $state<string | null>(null);
	let participants = $state<Participant[]>([]);
	let remoteScreenShare = $state<{ participant: RemoteParticipant; publication: RemoteTrackPublication } | null>(
		null
	);

	function refreshParticipants() {
		if (!session) return;
		participants = [session.room.localParticipant, ...session.room.remoteParticipants.values()];
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
		if (remoteScreenShare?.publication === publication && remoteScreenShare.participant === participant) {
			remoteScreenShare = null;
		}
	}

	$effect(() => {
		const name = roomId;
		if (!name) return;

		let cancelled = false;
		status = 'connecting';
		errorMessage = null;

		connect(name)
			.then((s) => {
				if (cancelled) {
					void s.disconnect();
					return;
				}
				session = s;
				status = 'connected';

				s.room
					.on(RoomEvent.ParticipantConnected, refreshParticipants)
					.on(RoomEvent.ParticipantDisconnected, refreshParticipants)
					.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
					.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
					.on(RoomEvent.Disconnected, () => {
						status = 'disconnected';
					});

				refreshParticipants();
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				status = 'error';
				errorMessage = err instanceof Error ? err.message : 'Failed to connect';
			});

		return () => {
			cancelled = true;
			if (session) {
				void session.disconnect();
				session = null;
			}
		};
	});

	onDestroy(() => {
		if (session) {
			void session.disconnect();
		}
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
	{#if status === 'connecting'}
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

				<div class="grid flex-1 auto-rows-fr grid-cols-1 gap-2 overflow-auto bg-gray-100 p-2 sm:grid-cols-2">
					{#each participants as participant (participant.identity)}
						{@const cameraPub = participant.getTrackPublication(Track.Source.Camera)}
						<VideoTile
							{participant}
							publication={cameraPub}
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
