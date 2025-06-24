<script lang="ts">
	import { goto } from "$app/navigation";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	let selectedTags = $state(data.selectedTags ?? []);
	let searchTerm = $state(data.search ?? '');

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

	function handleQueryClick(threadId: number) {
		goto(`/thread/${threadId}`, { keepFocus: true, noScroll: true });
	}
</script>

<div class="flex flex-col w-full gap-1">
	<div
		class="bg-gray border-border mx-auto flex w-full max-w-xl items-center gap-1 rounded-xl border p-3"
	>
		<form onsubmit={updateURL} class="flex w-full items-center gap-1">
			<input
				name="search"
				bind:value={searchTerm}
				placeholder="Search..."
				autocomplete="off"
				class="w-full text-sm bg-transparent outline-none"
			/>
			<button
				type="submit"
				class="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center justify-center"
				aria-label="Submit"
			>
				<span class="material-symbols-rounded">search</span>
			</button>
		</form>
	</div>
	<div class="flex gap-2">
		<div class="flex items-center gap-1 text-muted-foreground text-xs font-extralight">
			<span class="material-symbols-rounded">filter_list</span>
			<select onchange={handleTagSelection}>
				<option value="" disabled selected>Filter by tag</option>
				{#each data.tags.filter((t: any) => !selectedTags.includes(t)) as tag}
					<option value={tag}>{tag}</option>
				{/each}
			</select>
		</div>
		<div class="flex gap-2 text-muted-foreground text-xs font-extralight">
			{#each selectedTags as tag}
				<div
					class="flex items-center gap-1"
				>
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
<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
	{#if data.queries && data.queries.length > 0}
		{#each data.queries as query}
			<button onclick={() => handleQueryClick(query.threadId)} class="flex flex-col border border-border items-center justify-between rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors">
				<div class="flex flex-col items-center justify-center gap-2 mb-3 w-full">
					{query.query}
					<div class="flex flex-wrap gap-2 text-muted-foreground text-xs font-extralight">
						{#if query.tagsToQueries && query.tagsToQueries.length > 0}
							{#each query.tagsToQueries as tag}
								<span class="bg-gray rounded px-1">{tag.tag.name}</span>
							{/each}
						{/if}
					</div>
				</div>
				<div class="flex gap-2 text-muted-foreground text-sm">
					<span class="material-symbols-rounded">schedule</span>
					{new Date(query.timestamp).toLocaleDateString()}
				</div>
			</button>
		{/each}
	{:else}
		<p class="text-center text-muted-foreground col-span-full">No results found.</p>
	{/if}
</div>
