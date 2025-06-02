<script lang="ts">
	let { name, input }: { name: string, input: string } = $props();
</script>

<div class="text-sm text-muted-foreground">
	{#if name === 'search'}
		Searching for "{input}"
	{:else}
		{name}
	{/if}
</div>
