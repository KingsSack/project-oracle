<script lang="ts">
	let { topic } = $props();
</script>

<span class="text-muted-foreground bg-muted mx-1 inline rounded-lg px-1.5 py-0.5 text-sm">
	<button
		name="query"
		value={topic}
		type="submit"
		class="cursor-pointer hover:font-medium hover:text-black"
		aria-label="Learn more about {topic}"
	>
		{topic}
	</button>
</span>
