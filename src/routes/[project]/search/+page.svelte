<script lang="ts">
	import { goto } from '$app/navigation';
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
	
	let hasSearchTags = $derived(data.searchTags && data.searchTags.length > 0);

	function removeTag(tagToRemove: string) {
		selectedTags = selectedTags.filter((tag: string) => tag !== tagToRemove);
		updateURL();
	}

	function handleTagSelection(event: Event & { currentTarget: HTMLSelectElement }) {
		const newTag = event.currentTarget.value;
		if (newTag && !selectedTags.includes(newTag)) {
			selectedTags.push(newTag);
			selectedTags = selectedTags;
		}
		event.currentTarget.value = '';
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
		<div class="text-muted-foreground flex items-center gap-1 text-xs font-extralight">
			<span class="material-symbols-rounded">filter_list</span>
			<select onchange={handleTagSelection}>
				<option value="" disabled selected>Filter by tag</option>
				{#each (data.tags || []).filter((t: any) => !selectedTags.includes(t)) as tag}
					<option value={tag}>{tag}</option>
				{/each}
			</select>
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
							{#each Array.from(
								new Set(
									thread.queries
										.flatMap(query => query.tagsToQueries?.map(t => t.tag.name) ?? [])
								)
							).slice(0, 6) as tag}
								<span>{tag}</span>
							{/each}
							{#if Array.from(
								new Set(
									thread.queries
										.flatMap(query => query.tagsToQueries?.map(t => t.tag.name) ?? [])
								)
							).length > 6}
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
		<div class="col-span-full text-center py-12">
			{#if data.search}
				<p class="text-muted-foreground mb-2">No results found for "{data.search}"</p>
			{:else}
				<p class="text-muted-foreground mb-2">No threads found.</p>
				<p class="text-sm text-muted-foreground">
					Start a conversation to see your threads here.
				</p>
			{/if}
		</div>
	{/if}
</div>
