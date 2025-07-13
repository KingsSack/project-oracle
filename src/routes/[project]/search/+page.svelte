<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	interface Thread {
		id: number;
		title: string | null;
		similarity?: number;
		queries: Array<{
			id: number;
			query: string;
			timestamp: string;
			similarity?: number;
			tagsToQueries: Array<{
				tag: {
					name: string;
				};
			}>;
		}>;
	}

	let { data }: PageProps = $props();

	let selectedTags = $state(data.selectedTags ?? []);
	let searchTerm = $state(data.search ?? '');
	let tagSearchTerm = $state('');
	let isTagDropdownOpen = $state(false);

	function removeTag(tagToRemove: string) {
		selectedTags = selectedTags.filter((tag: string) => tag !== tagToRemove);
		updateURL();
	}

	function updateURL() {
		const params = new URLSearchParams();
		selectedTags.forEach((tag: string) => params.append('tags', tag));
		if (searchTerm) {
			params.set('search', searchTerm);
		}
		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true, replaceState: true });
	}

	function handleSearchSubmit(event: Event) {
		event.preventDefault();
		updateURL();
	}

	function handleThreadClick(thread: Thread) {
		goto(`/${data.currentProject?.toLowerCase() || 'default'}/query/${thread.queries[0]?.id}`, {
			keepFocus: true,
			noScroll: true
		});
	}

	function handleQueryClick(threadId: number, queryId: number) {
		goto(`/${data.currentProject?.toLowerCase() || 'default'}/query/${queryId}`, {
			keepFocus: true,
			noScroll: true
		});
	}

	function addTag(tag: string) {
		if (tag && !selectedTags.includes(tag)) {
			selectedTags.push(tag);
			selectedTags = selectedTags;
		}
		tagSearchTerm = '';
		isTagDropdownOpen = false;
		updateURL();
	}

	function toggleTagDropdown() {
		isTagDropdownOpen = !isTagDropdownOpen;
		if (isTagDropdownOpen) {
			tagSearchTerm = '';
		}
	}

	function handleTagSearch(event: Event & { currentTarget: HTMLInputElement }) {
		tagSearchTerm = event.currentTarget.value;
	}

	let filteredTags = $derived(
		(data.tags || [])
			.filter((tag: string) => !selectedTags.includes(tag))
			.filter((tag: string) => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
	);

	let tagDropdownRef: HTMLDivElement;

	onMount(() => {
		function handleClickOutside(event: MouseEvent) {
			if (tagDropdownRef && !tagDropdownRef.contains(event.target as Node)) {
				isTagDropdownOpen = false;
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="flex w-full flex-col gap-1">
	<div
		class="bg-gray border-border mx-auto flex w-full max-w-xl items-center gap-1 rounded-xl border p-3"
	>
		<form onsubmit={handleSearchSubmit} class="flex w-full items-center gap-1">
			<input
				name="search"
				bind:value={searchTerm}
				placeholder="Search threads, queries, and tags..."
				autocomplete="off"
				class="w-full bg-transparent text-sm outline-none"
			/>
			<button
				type="submit"
				class="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center justify-center"
				aria-label="Search"
			>
				<span class="material-symbols-rounded">search</span>
			</button>
		</form>
	</div>
	<div class="flex gap-2">
		<div class="text-muted-foreground relative flex items-center gap-1 text-xs font-extralight">
			<span class="material-symbols-rounded">filter_list</span>
			<div class="relative" bind:this={tagDropdownRef}>
				<button
					type="button"
					onclick={toggleTagDropdown}
					class="flex gap-1 cursor-pointer items-center justify-between px-2 py-1"
				>
					<span>Filter by tag</span>
					<span class="material-symbols-rounded text-base">
						{isTagDropdownOpen ? 'unfold_less' : 'unfold_more'}
					</span>
				</button>
				{#if isTagDropdownOpen}
					<div
						class="border-border bg-background absolute top-full left-0 z-10 mt-1 w-64 rounded border shadow-lg"
					>
						<div class="p-2">
							<input
								type="text"
								bind:value={tagSearchTerm}
								oninput={handleTagSearch}
								placeholder="Search tags..."
								class="border-border w-full rounded border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>
						<div class="max-h-48 overflow-y-auto">
							{#each filteredTags as tag}
								<button
									type="button"
									onclick={() => addTag(tag)}
									class="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
								>
									{tag}
								</button>
							{/each}
							{#if filteredTags.length === 0}
								<div class="text-muted-foreground px-3 py-2 text-sm">
									{tagSearchTerm ? 'No tags found' : 'No available tags'}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
		<div class="text-muted-foreground flex gap-2 text-xs font-extralight">
			{#each selectedTags as tag}
				<div class="flex items-center gap-1">
					<span>{tag}</span>
					<button
						type="button"
						onclick={() => removeTag(tag)}
						class="flex items-center"
						aria-label="Remove {tag} filter"
					>
						<span class="material-symbols-rounded">close</span>
					</button>
				</div>
			{/each}
		</div>
	</div>
</div>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
	{#if data.threads && data.threads.length > 0}
		{#each data.threads as thread}
			<button
				onclick={() => handleThreadClick(thread)}
				class="border-border flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-colors hover:bg-gray-50"
			>
				<div class="mb-3 flex w-full flex-col gap-2 text-left">
					<div class="flex items-start justify-between gap-2">
						<span class="flex-1">{thread.title}</span>
					</div>
					<div class="text-muted-foreground flex flex-wrap gap-2 text-xs font-extralight">
						{#if thread.queries && thread.queries.length > 0}
							{#each Array.from(new Set(thread.queries.flatMap((query) => query.tagsToQueries?.map((t) => t.tag.name) ?? []))).slice(0, 6) as tag}
								<span>{tag}</span>
							{/each}
							{#if Array.from(new Set(thread.queries.flatMap((query) => query.tagsToQueries?.map((t) => t.tag.name) ?? []))).length > 6}
								<span>...</span>
							{/if}
						{/if}
					</div>
				</div>
				{#if thread.queries && thread.queries.length > 0}
					<div class="text-muted-foreground flex gap-2 text-sm">
						<span class="material-symbols-rounded">schedule</span>
						{new Date(thread.queries[thread.queries.length - 1].timestamp).toLocaleDateString()}
					</div>
				{/if}
			</button>
		{/each}
	{:else}
		<div class="col-span-full py-12 text-center">
			{#if data.search}
				<p class="text-muted-foreground mb-2">No results found for "{data.search}"</p>
			{:else}
				<p class="text-muted-foreground mb-2">No threads found.</p>
				<p class="text-muted-foreground text-sm">Start a conversation to see your threads here.</p>
			{/if}
		</div>
	{/if}
</div>
