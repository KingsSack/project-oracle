<script lang="ts">
	let { topic } = $props();

	let createNewThread = $state(false);

	function updateModifierKeys(event: KeyboardEvent | MouseEvent) {
		createNewThread = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
	}

	function handleKeyDown(event: KeyboardEvent) {
		updateModifierKeys(event);
	}

	function handleKeyUp(event: KeyboardEvent) {
		updateModifierKeys(event);
	}

	function handleMouseMove(event: MouseEvent) {
		updateModifierKeys(event);
	}
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} onmousemove={handleMouseMove} />

<span class="text-muted-foreground bg-muted mx-1 inline rounded-lg px-1.5 py-0.5 text-sm">
	<input type="hidden" name="createNewThread" value={createNewThread} />
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
