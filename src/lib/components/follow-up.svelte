<script lang="ts">
	let { query } = $props();
</script>

<button
	name="query"
	value={query}
	type="submit"
	class="border-border text-muted-foreground cursor-pointer rounded-xl border px-3 py-1 text-left text-sm font-medium"
	aria-label="Follow up query: {query}"
>
	{query}
</button>
