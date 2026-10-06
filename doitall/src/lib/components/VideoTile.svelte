<script lang="ts">
	import { RoomEvent, Track, type Participant, type TrackPublication } from 'livekit-client';

	let {
		participant,
		publication,
		isLocal = false
	}: {
		participant: Participant;
		publication?: TrackPublication;
		isLocal?: boolean;
	} = $props();

	let videoEl: HTMLVideoElement | undefined = $state();
	let audioEl: HTMLAudioElement | undefined = $state();

	// LiveKit publications are plain objects: `getTrackPublication(...)` keeps
	// returning the *same* reference even when tracks are (un)published,
	// (un)subscribed or (un)muted. Without an explicit reactive trigger, the
	// tile would be stuck in the "not yet subscribed" state — i.e. no video and
	// a permanently "muted" icon. Bump a local revision on every relevant
	// participant event so the $derived values (and the attach effects below)
	// recompute.
	let revision = $state(0);

	$effect(() => {
		const p = participant;
		const bump = () => {
			revision++;
		};

		p.on(RoomEvent.TrackPublished, bump);
		p.on(RoomEvent.TrackUnpublished, bump);
		p.on(RoomEvent.TrackSubscribed, bump);
		p.on(RoomEvent.TrackUnsubscribed, bump);
		p.on(RoomEvent.TrackMuted, bump);
		p.on(RoomEvent.TrackUnmuted, bump);
		p.on(RoomEvent.TrackStreamStateChanged, bump);
		p.on(RoomEvent.LocalTrackPublished, bump);
		p.on(RoomEvent.LocalTrackUnpublished, bump);

		return () => {
			p.off(RoomEvent.TrackPublished, bump);
			p.off(RoomEvent.TrackUnpublished, bump);
			p.off(RoomEvent.TrackSubscribed, bump);
			p.off(RoomEvent.TrackUnsubscribed, bump);
			p.off(RoomEvent.TrackMuted, bump);
			p.off(RoomEvent.TrackUnmuted, bump);
			p.off(RoomEvent.TrackStreamStateChanged, bump);
			p.off(RoomEvent.LocalTrackPublished, bump);
			p.off(RoomEvent.LocalTrackUnpublished, bump);
		};
	});

	// The <video> publication: an explicitly passed one (used for screen
	// share) or the participant's camera by default.
	const videoPub = $derived.by(() => {
		revision;
		return publication ?? participant.getTrackPublication(Track.Source.Camera);
	});

	// The <audio> publication: the microphone for regular camera tiles. Skipped
	// for the local participant (the local <video> already carries the preview
	// audio and is tagged `muted` to avoid an echo) and for screen-share tiles.
	const audioPub = $derived.by(() => {
		revision;
		if (isLocal) return undefined;
		if (videoPub?.source === Track.Source.ScreenShare) return undefined;
		return participant.getTrackPublication(Track.Source.Microphone);
	});

	// Mute indicator is based on the microphone, not the camera.
	const micPub = $derived.by(() => {
		revision;
		return participant.getTrackPublication(Track.Source.Microphone);
	});

	const videoTrack = $derived(videoPub?.track);
	const audioTrack = $derived(audioPub?.track);
	const isMuted = $derived(micPub?.isMuted ?? true);
	const label = $derived(participant.name || participant.identity);

	$effect(() => {
		const current = videoTrack;
		const el = videoEl;
		if (!current || !el || current.kind !== 'video') return;

		current.attach(el);

		return () => {
			current.detach(el);
		};
	});

	$effect(() => {
		const current = audioTrack;
		const el = audioEl;
		if (!current || !el) return;

		current.attach(el);

		return () => {
			current.detach(el);
		};
	});
</script>

<div
	class="relative overflow-hidden rounded-lg bg-gray-900 shadow"
	data-testid="video-tile"
	data-identity={participant.identity}
>
	{#if videoTrack && videoTrack.kind === 'video'}
		<video
			bind:this={videoEl}
			class="h-full w-full object-cover"
			autoplay
			playsinline
			muted={isLocal}
		></video>
	{:else}
		<div class="flex h-full w-full items-center justify-center text-gray-400">
			<span class="text-sm">{label}</span>
		</div>
	{/if}

	{#if !isLocal}
		<audio bind:this={audioEl} autoplay playsinline></audio>
	{/if}

	<div
		class="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-xs text-white"
	>
		<span>{label}{isLocal ? ' (you)' : ''}</span>
		{#if isMuted}
			<span aria-label="muted" title="Muted">🔇</span>
		{/if}
	</div>
</div>
