<script lang="ts">
	import { goto } from "$app/navigation";

    let { queries, queryId, project } = $props();

    function selectQuery(queryId: number) {
		goto(`/${project.toLowerCase()}/query/${queryId}`, { keepFocus: true, replaceState: true });
	}
</script>

<div class="fixed right-0 top-1/2 mr-2 flex -translate-y-1/2 flex-col justify-center gap-4 text-end align-end">
	{#each queries as query}
		{#if query.id === queryId}
			<span class="text-sm font-medium truncate max-w-[45ch]" title={query.query}>
				{query.query}
			</span>
		{:else}
			<button
				onclick={() => selectQuery(query.id)}
				class="text-sm font-light truncate max-w-[45ch] hover:text-gray cursor-pointer text-end"
				aria-label="Jump to query {query.query}"
			>
				{query.query}
			</button>
		{/if}
	{/each}
</div>