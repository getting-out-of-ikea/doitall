<script lang="ts">
	import { APP_VERSION } from '$lib/version';

	let { data } = $props();
</script>

<svelte:head><title>doitall</title></svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="text-3xl font-bold text-gray-900">Welcome, {data.user?.email}</h1>
	<p class="mt-1 text-sm text-gray-400">Version {APP_VERSION}</p>
	<p class="mt-4 text-gray-600">Start a call by entering a room name below.</p>

	<form method="GET" action="/call/placeholder" class="mt-6 flex gap-2" onsubmit={(e) => e.preventDefault()}>
		<input
			type="text"
			name="room"
			placeholder="room-name"
			pattern="[a-zA-Z0-9_\-]&#123;1,64&#125;"
			required
			class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		/>
		<button
			type="submit"
			class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			onclick={(e) => {
				const form = (e.currentTarget as HTMLButtonElement).form;
				const input = form?.querySelector<HTMLInputElement>('input[name="room"]');
				if (input?.value) {
					window.location.href = `/call/${encodeURIComponent(input.value)}`;
				}
			}}
		>
			Join call
		</button>
	</form>
</div>
