<script lang="ts">
	import { page } from '$app/state';
	import CallView from '$lib/components/CallView.svelte';

	const roomId = $derived(page.params.roomId);
</script>

<CallView {roomId} />
