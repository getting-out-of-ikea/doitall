<script lang="ts">
	import './layout.css';
	import { createClient } from '$lib/supabase/client';

	let { children, data } = $props();

	const supabase = createClient();
	let user = $state(data.user);

	$effect(() => {
		user = data.user;
	});

	$effect(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			user = session?.user ?? null;
		});
		return () => subscription.unsubscribe();
	});
</script>

<header class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
	<a href="/" class="text-lg font-semibold text-gray-900">doitall</a>
	{#if user}
		<div class="flex items-center gap-3">
			<span class="text-sm text-gray-600">{user.email}</span>
			<form method="POST" action="/logout">
				<button type="submit" class="text-sm text-blue-600 hover:underline">Sign out</button>
			</form>
		</div>
	{:else}
		<a href="/login" class="text-sm text-blue-600 hover:underline">Sign in</a>
	{/if}
</header>

{@render children()}
