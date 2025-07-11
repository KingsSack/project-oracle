<script lang="ts">
	let { name, input }: { name: string, input: string } = $props();
</script>

<div class="text-sm text-muted-foreground">
	{#if name === 'search'}
		Searching for "{JSON.parse(input).query}"
	{:else}
		{name}
	{/if}
</div>
