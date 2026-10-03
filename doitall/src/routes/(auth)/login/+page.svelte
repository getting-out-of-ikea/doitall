<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { createClient } from '$lib/supabase/client';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let mode = $state<'login' | 'signup'>('login');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	const supabase = createClient();

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		error = null;
		message = null;

		try {
			if (mode === 'login') {
				const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
				if (signInError) throw signInError;
				await invalidateAll();
				const redirectTo = page.url.searchParams.get('redirectTo') ?? '/';
				await goto(redirectTo);
			} else {
				const { error: signUpError } = await supabase.auth.signUp({ email, password });
				if (signUpError) throw signUpError;
				message = 'Check your email to confirm your account.';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>{mode === 'login' ? 'Sign in' : 'Sign up'}</title></svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-sm rounded-lg bg-white p-8 shadow">
		<h1 class="mb-6 text-2xl font-semibold text-gray-900">
			{mode === 'login' ? 'Sign in' : 'Create account'}
		</h1>

		{#if data.user}
			<p class="text-sm text-gray-600">
				You are already signed in as <strong>{data.user.email}</strong>.
			</p>
			<a href="/" class="mt-4 inline-block text-sm text-blue-600 hover:underline">Go to home</a>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						minlength="6"
						autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>

				{#if error}
					<p class="text-sm text-red-600">{error}</p>
				{/if}
				{#if message}
					<p class="text-sm text-green-600">{message}</p>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
				</button>
			</form>

			<button
				type="button"
				onclick={() => {
					mode = mode === 'login' ? 'signup' : 'login';
					error = null;
					message = null;
				}}
				class="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
			>
				{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
			</button>
		{/if}
	</div>
</div>
