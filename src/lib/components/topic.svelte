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

<span
	class="inline cursor-pointer rounded-lg transition-all hover:bg-gray-100 hover:px-2 hover:py-0.5 hover:font-medium"
>
	<input type="hidden" name="createNewThread" value={createNewThread} />
	<button
		name="query"
		value={topic}
		type="submit"
		class="cursor-pointer"
		aria-label="Learn more about {topic}"
	>
		{topic}
	</button>
</span>
