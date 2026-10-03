<script lang="ts">
	import { onMount } from 'svelte';
	import type { Participant, TrackPublication } from 'livekit-client';

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

	const track = $derived(publication?.track);
	const isMuted = $derived(publication?.isMuted ?? true);
	const label = $derived(participant.name || participant.identity);

	onMount(() => {
		return () => {
			track?.detach();
		};
	});

	$effect(() => {
		const current = track;
		if (!current) return;

		if (current.kind === 'video' && videoEl) {
			current.attach(videoEl);
		} else if (current.kind === 'audio' && audioEl && !isLocal) {
			current.attach(audioEl);
		}

		return () => {
			current.detach();
		};
	});
</script>

<div
	class="relative overflow-hidden rounded-lg bg-gray-900 shadow"
	data-testid="video-tile"
	data-identity={participant.identity}
>
	{#if track && track.kind === 'video'}
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
		<audio bind:this={audioEl} autoplay></audio>
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
