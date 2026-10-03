<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>doitall</title></svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<h1 class="text-3xl font-bold text-gray-900">Welcome, {data.user?.email}</h1>
	<p class="mt-4 text-gray-600">
		You are signed in. Video calling features will be added in the next phases.
	</p>
</div>
