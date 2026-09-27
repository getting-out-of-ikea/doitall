<script lang="ts">
	import { goto } from '$app/navigation';
	import { isValidRoomId } from '$lib/livekit/room-id';

	let roomName = $state('');
	let error = $state<string | null>(null);

	function enterRoom(event: SubmitEvent) {
		event.preventDefault();
		error = null;

		const trimmed = roomName.trim();

		if (!trimmed) {
			// Nessun nome: stanza casuale.
			void goto(`/rooms/${crypto.randomUUID()}`);
			return;
		}

		// Stessa validazione dell'endpoint `/api/livekit/token`: evita un 400 inutile.
		if (!isValidRoomId(trimmed)) {
			error =
				'Nome non valido: usa solo lettere, numeri, underscore e trattini (max 64 caratteri).';
			return;
		}

		void goto(`/rooms/${trimmed}`);
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="text-2xl font-semibold">Stanze</h1>
	<p class="mt-3 text-gray-600">
		Inserisci il nome di una stanza esistente per entrare, oppure lascia il campo vuoto per
		crearne una nuova con un identificativo casuale.
	</p>

	<form class="mt-6 flex flex-col gap-3 sm:flex-row" onsubmit={enterRoom}>
		<input
			bind:value={roomName}
			class="flex-1 rounded border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
			placeholder="nome-stanza (vuoto = stanza casuale)"
			type="text"
		/>
		<button
			class="rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
			type="submit"
		>
			{roomName.trim() ? 'Entra' : 'Crea stanza'}
		</button>
	</form>

	{#if error}
		<p class="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
	{/if}

	<p class="mt-6 text-xs text-gray-500">
		Suggerimento: condividi il nome della stanza con le altre persone per farle entrare nella
		stessa chiamata.
	</p>
</div>
