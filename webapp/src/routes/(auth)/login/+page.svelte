<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { signIn, signUp } from '$lib/supabase/helpers';

	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	function safeRedirect(target: string | null): string {
		if (!target) return '/';
		if (!target.startsWith('/') || target.startsWith('//')) return '/';
		return target;
	}

	function toggleMode() {
		mode = mode === 'login' ? 'signup' : 'login';
		error = null;
		message = null;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		error = null;
		message = null;

		try {
			if (mode === 'login') {
				await signIn(email, password);
				await goto(safeRedirect(page.url.searchParams.get('redirectTo')), {
					invalidateAll: true
				});
			} else {
				const data = await signUp(email, password);
				if (data.session) {
					await goto('/', { invalidateAll: true });
				} else {
					message = "Registrazione completata. Controlla la tua email per confermare l'account.";
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Si è verificato un errore inatteso.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
	<h1 class="text-2xl font-semibold">
		{mode === 'login' ? 'Accedi' : 'Crea un account'}
	</h1>

	<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium text-gray-700">Email</span>
			<input
				autocomplete="email"
				bind:value={email}
				class="rounded border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
				required
				type="email"
			/>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium text-gray-700">Password</span>
			<input
				autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
				bind:value={password}
				class="rounded border border-gray-300 px-3 py-2 focus:border-gray-900 focus:outline-none"
				minlength="6"
				required
				type="password"
			/>
		</label>

		{#if error}
			<p class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
		{/if}
		{#if message}
			<p class="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
		{/if}

		<button
			class="rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
			disabled={loading}
			type="submit"
		>
			{loading ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Registrati'}
		</button>
	</form>

	<button class="text-sm text-gray-600 underline" onclick={toggleMode} type="button">
		{mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
	</button>
</div>
