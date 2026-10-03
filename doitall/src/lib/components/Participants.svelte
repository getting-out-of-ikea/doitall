<script lang="ts">
	import type { Participant } from 'livekit-client';

	let { participants }: { participants: Participant[] } = $props();
</script>

<aside
	class="w-56 shrink-0 border-l border-gray-200 bg-white p-4"
	data-testid="participants"
>
	<h2 class="mb-3 text-sm font-semibold text-gray-900">Participants ({participants.length})</h2>
	<ul class="space-y-2">
		{#each participants as participant (participant.identity)}
			<li class="flex items-center gap-2 text-sm text-gray-700">
				<span
					class="h-2 w-2 rounded-full {participant.isSpeaking ? 'bg-green-500' : 'bg-gray-300'}"
				></span>
				<span class="truncate">{participant.name || participant.identity}</span>
			</li>
		{/each}
	</ul>
</aside>
