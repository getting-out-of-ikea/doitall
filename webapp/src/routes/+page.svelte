<script lang="ts">
	import { page } from '$app/state';

	const user = $derived(page.data.user);
</script>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="text-2xl font-semibold">Benvenuto{user ? `, ${user.email}` : ''}!</h1>
	<p class="mt-3 text-gray-600">
		Entra in una stanza per iniziare una videocomunicazione.
	</p>

	<div class="mt-6 flex flex-wrap gap-3">
		<a
			class="rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
			href="/rooms"
		>
			Stanze
		</a>
	</div>
</div>
