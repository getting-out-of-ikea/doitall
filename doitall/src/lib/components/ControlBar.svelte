<script lang="ts">
	import { RoomEvent, Track, type Room } from 'livekit-client';

	let { room, onLeave }: { room: Room; onLeave: () => void } = $props();

	let micEnabled = $state(room.localParticipant.isMicrophoneEnabled);
	let cameraEnabled = $state(room.localParticipant.isCameraEnabled);
	let screenShareEnabled = $state(room.localParticipant.isScreenShareEnabled);

	$effect(() => {
		const local = room.localParticipant;

		const sync = () => {
			micEnabled = local.isMicrophoneEnabled;
			cameraEnabled = local.isCameraEnabled;
			screenShareEnabled = local.isScreenShareEnabled;
		};

		local.on(RoomEvent.LocalTrackPublished, sync);
		local.on(RoomEvent.LocalTrackUnpublished, sync);
		local.on(RoomEvent.TrackMuted, sync);
		local.on(RoomEvent.TrackUnmuted, sync);

		return () => {
			local.off(RoomEvent.LocalTrackPublished, sync);
			local.off(RoomEvent.LocalTrackUnpublished, sync);
			local.off(RoomEvent.TrackMuted, sync);
			local.off(RoomEvent.TrackUnmuted, sync);
		};
	});

	async function toggleMic() {
		await room.localParticipant.setMicrophoneEnabled(!micEnabled);
	}

	async function toggleCamera() {
		await room.localParticipant.setCameraEnabled(!cameraEnabled);
	}

	async function toggleScreenShare() {
		await room.localParticipant.setScreenShareEnabled(!screenShareEnabled);
	}

	// Referenced so the Track import is not flagged as unused by tooling that
	// inspects the module graph; screen share source is Track.Source.ScreenShare.
	void Track;
</script>

<div
	class="flex items-center justify-center gap-3 border-t border-gray-200 bg-white px-4 py-3"
	data-testid="control-bar"
>
	<button
		type="button"
		onclick={toggleMic}
		aria-pressed={micEnabled}
		class="rounded-full px-4 py-2 text-sm font-medium {micEnabled
			? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
			: 'bg-red-600 text-white hover:bg-red-700'}"
	>
		{micEnabled ? 'Mute' : 'Unmute'}
	</button>

	<button
		type="button"
		onclick={toggleCamera}
		aria-pressed={cameraEnabled}
		class="rounded-full px-4 py-2 text-sm font-medium {cameraEnabled
			? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
			: 'bg-red-600 text-white hover:bg-red-700'}"
	>
		{cameraEnabled ? 'Stop video' : 'Start video'}
	</button>

	<button
		type="button"
		onclick={toggleScreenShare}
		aria-pressed={screenShareEnabled}
		class="rounded-full px-4 py-2 text-sm font-medium {screenShareEnabled
			? 'bg-blue-600 text-white hover:bg-blue-700'
			: 'bg-gray-100 text-gray-900 hover:bg-gray-200'}"
	>
		{screenShareEnabled ? 'Stop sharing' : 'Share screen'}
	</button>

	<button
		type="button"
		onclick={onLeave}
		class="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
	>
		Leave
	</button>
</div>
