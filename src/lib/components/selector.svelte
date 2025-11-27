<script lang="ts">
	import { onMount } from 'svelte';

	let { current, items = [], onSelect, children, searchTerm = $bindable('') } = $props();
	let isOpen = $state(false);

	function selectItem(item: string) {
		onSelect?.(item);
		isOpen = false;
	}

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			searchTerm = '';
		}
	}

	function handleSearch(event: Event & { currentTarget: HTMLInputElement }) {
		searchTerm = event.currentTarget.value;
	}

	let filteredResults = $derived(
		items.filter((item: string) => item.toLowerCase().includes(searchTerm.toLowerCase()))
	);

	let dropdownRef: HTMLDivElement;

	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="relative" bind:this={dropdownRef}>
	<button
		type="button"
		class="text-muted-foreground inline-flex cursor-pointer items-center justify-center gap-x-1 rounded-md"
		onclick={toggleDropdown}
	>
		<p class="text-foreground text-sm">{current}</p>
		<span class="material-symbols-rounded transition-opacity hover:opacity-80">
			{isOpen ? 'unfold_less' : 'unfold_more'}
		</span>
	</button>

	{#if isOpen}
		<div
			class="absolute top-full left-0 z-10 mt-1 min-w-full rounded-md border border-gray-200 bg-white shadow-lg"
		>
			<div class="p-2">
				<input
					type="text"
					bind:value={searchTerm}
					oninput={handleSearch}
					placeholder="Search..."
					class="border-border w-full rounded border px-2 py-1 text-sm outline-none focus:ring-1"
				/>
			</div>
			{#each filteredResults as item}
				<button
					type="button"
					onclick={() => selectItem(item)}
					class="w-full px-3 py-2 text-left text-sm first:rounded-t-md last:rounded-b-md hover:bg-gray-100"
				>
					{item}
				</button>
			{/each}
			{#if filteredResults.length === 0}
				<div class="text-muted-foreground px-3 py-2 text-sm">
					{searchTerm ? 'No results found' : 'No available items'}
				</div>
			{/if}
			{@render children()}
		</div>
	{/if}
</div>
