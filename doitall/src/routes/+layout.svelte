<script lang="ts">
	import './layout.css';

	let { children, data } = $props();
</script>

<header class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
	<a href="/" class="text-lg font-semibold text-gray-900">doitall</a>
	{#if data.user}
		<div class="flex items-center gap-3">
			<span class="text-sm text-gray-600">{data.user.email}</span>
			<form method="POST" action="/logout">
				<button type="submit" class="text-sm text-blue-600 hover:underline">Sign out</button>
			</form>
		</div>
	{:else}
		<a href="/login" class="text-sm text-blue-600 hover:underline">Sign in</a>
	{/if}
</header>

{@render children()}
