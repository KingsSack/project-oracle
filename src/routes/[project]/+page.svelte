<script lang="ts">
	import { enhance } from '$app/forms';
	import Card from '$lib/components/card.svelte';
	import Selector from '$lib/components/selector.svelte';
	import TabGroup from '$lib/components/tab-group.svelte';
	import Tab from '$lib/components/tab.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let projects = $state(data.projects || []);
	let currentSource = $state('Web');
	let currentModelGroup = $state('Auto');

	function changeSource(source: string) {
		currentSource = source;
	}

	function changeModelGroup(group: string) {
		currentModelGroup = group;
	}

	let formElement: HTMLFormElement;
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			formElement.requestSubmit();
		}
	}
</script>

<h1 class="mb-2 text-center text-6xl font-bold">Project Oracle</h1>

{#if form?.error}
	<p>{form.error}</p>
{/if}

<form method="POST" action="?/query" class="m-0 w-full p-0" use:enhance bind:this={formElement}>
	<div class="bg-gray border-border flex w-full flex-col gap-1 rounded-xl border p-3">
		<textarea
			name="query"
			placeholder="Find what you are looking for..."
			autocomplete="off"
			rows="7"
			class="text-sm outline-none"
			required
			onkeydown={handleKeyDown}
		></textarea>
		<input type="hidden" name="project" value={data.currentProject} />
		<input type="hidden" name="source" value={currentSource} />
		<input type="hidden" name="modelGroup" value={currentModelGroup} />
		<div class="flex items-center justify-between gap-2">
			<TabGroup>
				<Tab active={true}>Answer</Tab>
				<Tab>Research</Tab>
			</TabGroup>
			<div class="flex items-center gap-3">
				<Selector
					current={currentSource}
					items={['Web', 'Notion', 'Drive']}
					onSelect={changeSource}
				/>
				<Selector
					current={currentModelGroup}
					items={data.modelGroups}
					onSelect={changeModelGroup}
				/>
				<button
					type="submit"
					class="text-muted-foreground inline-flex cursor-pointer items-center justify-center gap-x-2 rounded-md transition-opacity hover:opacity-80"
					aria-label="Submit"
				>
					<span class="material-symbols-rounded">send</span>
				</button>
			</div>
		</div>
	</div>
</form>

<div class="grid w-full grid-cols-3 grid-rows-2 gap-4 overflow-hidden">
	{#each projects as project}
		<Card title={project.name} image="" />
	{/each}
</div>
