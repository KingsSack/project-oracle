<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Markdown from '$lib/components/markdown.svelte';
	import TabGroup from '$lib/components/tab-group.svelte';
	import Tab from '$lib/components/tab.svelte';
	import Tag from '$lib/components/tag.svelte';
	import { onMount } from 'svelte';

	let { data, form } = $props();
	let response = $state(data.result);
	let tags = $state(data.tags);

	onMount(() => {
		if (data.result === null) {
			const eventSource = new EventSource(`/api/response/${page.params.id}`);

			eventSource.onmessage = (event) => {
				const data = JSON.parse(event.data);

				if (data.type === 'chunk') {
					response += data.content;
				} else if (data.type === 'complete') {
					response = data.content;
					eventSource.close();
				} else if (data.type === 'error') {
					console.error('Streaming error:', data.content);
					eventSource.close();
				}
			};

			eventSource.onerror = () => {
				eventSource.close();
			};

			return () => eventSource.close();
		}

		if (data.tags.length === 0) {
			console.log('Streaming tags...');
			const eventSource = new EventSource(`/api/tags/${page.params.id}`);

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === 'chunk') {
						tags = data.content;
					} else if (data.type === 'complete') {
						tags = data.content;
						eventSource.close();
					} else if (data.type === 'error') {
						eventSource.close();
					}
				} catch (parseError) {
					console.error('Failed to parse event data:', event.data, parseError);
					eventSource.close();
				}
			};

			eventSource.onerror = (error) => {
				console.error('EventSource error:', error);
				eventSource.close();
			};

			return () => eventSource.close();
		}
	});
</script>

{#if form?.error}
	<p>{form.error}</p>
{/if}

<div class="flex w-full flex-col gap-4">
	<h1 class="mb-2 text-start text-2xl font-medium">{data.name}</h1>

	<div class="flex gap-4">
		{#each tags as tag}
			<Tag>{tag.name}</Tag>
		{/each}
	</div>

	<TabGroup>
		<Tab active={true}>Response</Tab>
		<!-- <Tab>Sites</Tab> -->
		<!-- <Tab>Images</Tab> -->
	</TabGroup>

	<Markdown content={response?.toString()} />

	<div class="flex gap-2">
		<!-- <button
			class="border-border text-muted-foreground cursor-pointer rounded-xl border px-3 py-1 text-sm font-medium"
			aria-label="Lorem">Lorem
		</button>
		<button
			class="border-border text-muted-foreground cursor-pointer rounded-xl border px-3 py-1 text-sm font-medium"
			aria-label="Ipsum">Ipsum
		</button> -->
	</div>
</div>

<div class="align-end absolute right-0 mr-2 flex flex-col justify-center gap-4 text-end">
	<!-- <a href="/" class="text-sm font-light">Test</a>
    <a href="/" class="text-sm font-medium">Lorem Ipsum</a> -->
</div>

<form method="POST" action="?/query" class="m-0 w-full p-0" use:enhance>
	<div
		class="flex bg-gray border-border fixed bottom-0 mx-auto mb-4 w-full max-w-xl gap-1 rounded-xl border p-3 items-center"
	>
		<textarea
			name="query"
			value={form?.query ?? ''}
			placeholder="Follow up..."
			autocomplete="off"
			rows="1"
			class="text-sm w-full"
			required
		></textarea>
		<button
			type="submit"
			class="rounded-md inline-flex items-center justify-center cursor-pointer gap-x-2 text-muted-foreground hover:text-foreground transition-colors"
			aria-label="Submit"
		>
			<span class="material-symbols-rounded">send</span>
		</button>
	</div>
</form>
