<script lang="ts">
	import { page } from '$app/state';

	const user = $derived(page.data.user);
</script>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="text-2xl font-semibold">Benvenuto{user ? `, ${user.email}` : ''}!</h1>
	<p class="mt-3 text-gray-600">
		L'accesso è attivo. Le funzionalità di videocomunicazione verranno aggiunte nelle prossime fasi.
	</p>
</div>
