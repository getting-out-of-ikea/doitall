<script lang="ts">
	import { page } from '$app/state';
	import { Track } from 'livekit-client';
	import { CallSession } from '$lib/livekit/room.svelte';
	import VideoTile from '$lib/components/VideoTile.svelte';
	import ControlBar from '$lib/components/ControlBar.svelte';
	import Participants from '$lib/components/Participants.svelte';

	const session = new CallSession();
	const roomId = $derived(page.params.roomId);

	// Connette quando la rotta è nota e disconnette allo smontaggio / cambio stanza.
	$effect(() => {
		const id = roomId;
		if (!id) return;
		void session.connect(id);
		return () => {
			void session.disconnect();
		};
	});

	const allParticipants = $derived(session.allParticipants);
	const screenSharers = $derived(session.screenSharers);
	const summaryCount = $derived(session.participantSummaries.length);

	function getGridClass(count: number): string {
		if (count <= 1) return 'grid-cols-1';
		if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
		return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
	}

	const gridClass = $derived(getGridClass(allParticipants.length));
</script>

<div class="flex min-h-[calc(100dvh-57px)] flex-col gap-4 px-4 py-4">
	<header class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-lg font-semibold">Stanza: {roomId}</h1>
			<p class="text-xs text-gray-500">
				{#if session.status === 'connected'}
					{summaryCount} {summaryCount === 1 ? 'partecipante' : 'partecipanti'}
				{:else if session.status === 'connecting'}
					Connessione in corso…
				{:else if session.status === 'error'}
					Errore di connessione
				{:else if session.status === 'disconnected'}
					Disconnesso
				{:else}
					Pronto
				{/if}
			</p>
		</div>
	</header>

	{#if session.status === 'idle' || session.status === 'connecting'}
		<div class="flex flex-1 items-center justify-center text-sm text-gray-500">
			Connessione alla stanza in corso…
		</div>
	{:else if session.status === 'error'}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
			<p class="max-w-md text-sm text-red-600">
				{session.error ?? 'Errore di connessione a LiveKit.'}
			</p>
			<div class="flex gap-2">
				<button
					class="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
					onclick={() => roomId && session.connect(roomId)}
					type="button"
				>
					Riprova
				</button>
				<a
					class="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					href="/"
				>
					Torna alla home
				</a>
			</div>
		</div>
	{:else}
		<div class="flex flex-1 flex-col gap-4 lg:flex-row">
			<div class="flex min-w-0 flex-1 flex-col gap-4">
				{#if screenSharers.length}
					<div class="grid gap-4">
						{#each screenSharers as p (p.identity)}
							<div class="aspect-video w-full">
								<VideoTile {session} participant={p} source={Track.Source.ScreenShare} />
							</div>
						{/each}
					</div>
				{/if}

				<div class="grid flex-1 auto-rows-fr gap-4 {gridClass}">
					{#each allParticipants as p (p.identity)}
						<div class="aspect-video w-full">
							<VideoTile {session} participant={p} />
						</div>
					{/each}
				</div>
			</div>

			<aside class="w-full lg:w-72 lg:shrink-0">
				<Participants {session} />
			</aside>
		</div>

		<ControlBar {session} />
	{/if}
</div>
