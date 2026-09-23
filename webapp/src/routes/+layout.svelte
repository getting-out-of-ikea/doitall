<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen flex-col bg-white text-gray-900">
	<header class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
		<a class="text-base font-semibold" href="/">Video App</a>
		{#if data.user}
			<div class="flex items-center gap-3">
				<span class="text-sm text-gray-600">{data.user.email}</span>
				<form action="/logout" method="POST">
					<button
						class="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
						type="submit"
					>
						Logout
					</button>
				</form>
			</div>
		{/if}
	</header>
	<main class="flex-1">
		{@render children()}
	</main>
</div>
