<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Markdown from '$lib/components/markdown.svelte';
	import TabGroup from '$lib/components/tab-group.svelte';
	import Tab from '$lib/components/tab.svelte';
	import Tag from '$lib/components/tag.svelte';
	import ToolCall from '$lib/components/tool-call.svelte';
	import { onMount } from 'svelte';

	interface SiteData {
		name: string;
		url: string;
	}

	interface ToolCallData {
		name: string;
		input: string;
		output: string;
	}

	interface TagData {
		name: string;
	}

	let { data, form }: { data: any; form: any } = $props();
	
	let response = $state(data.result || '');
	let tags = $state<TagData[]>(data.tags || []);
	let toolCalls = $state<ToolCallData[]>(data.toolCalls || []);
	let sites = $state<SiteData[]>(data.sites || []);

	let activeTab = $state('response');

	onMount(() => {
		const cleanupFunctions: (() => void)[] = [];

		if (data.result === null) {
			const eventSource = new EventSource(`/api/response/${page.params.id}`);

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === 'tool_request') {
						toolCalls.push({
							name: data.content.name,
							input: data.content.input.query,
							output: ''
						});

						if (data.content.name === 'search') {
							sites.push({
								name: 'Google',
								url: `https://www.google.com/search?q=${encodeURIComponent(data.content.input.query)}`
							});
						}
					} else if (data.type === 'chunk') {
						response = (response || '') + data.content;
					} else if (data.type === 'complete') {
						response = data.content;
						eventSource.close();
					} else if (data.type === 'error') {
						console.error('Streaming error:', data.content);
						eventSource.close();
					}
				} catch (parseError) {
					console.error('Failed to parse JSON from event:', event.data, parseError);
					// Try to extract any readable error message
					if (event.data.includes('error')) {
						console.error('Streaming error: Failed to parse JSON');
						eventSource.close();
					}
				}
			};

			eventSource.onerror = () => {
				eventSource.close();
			};

			cleanupFunctions.push(() => eventSource.close());
		}

		if (data.tags.length === 0) {
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

			eventSource.onerror = () => {
				eventSource.close();
			};

			cleanupFunctions.push(() => eventSource.close());
		}

		// Return cleanup function that closes all EventSources
		return () => {
			cleanupFunctions.forEach((cleanup) => cleanup());
		};
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

	<div>
		<TabGroup>
			<Tab active={activeTab === 'response'} onclick={() => (activeTab = 'response')}>Response</Tab>
			{#if sites.length > 0}
				<Tab active={activeTab === 'tools'} onclick={() => (activeTab = 'sites')}>Sites</Tab>
			{/if}
		</TabGroup>
	</div>

	{#if activeTab === 'response'}
		{#each toolCalls as toolCall}
			<div class="flex gap-2 items-center">
				<div
					class="border-border text-muted-foreground flex aspect-square h-5 w-5 items-center justify-center rounded-full border text-xs font-extralight"
				>
					{toolCalls.indexOf(toolCall) + 1}
				</div>
				<ToolCall name={toolCall.name} input={toolCall.input} />
			</div>
		{/each}
		<div class="flex gap-2">
			<div class="flex w-5 h-6 items-center justify-center">
				<div
					class="border-border text-muted-foreground flex aspect-square h-5 w-5 items-center justify-center rounded-full border text-xs font-extralight"
				>
					{toolCalls.length + 1}
				</div>
			</div>
			<Markdown content={response?.toString()} />
		</div>
	{:else if activeTab === 'sites'}
		{#each sites as site}
			<div class="flex gap-2">
				<div
					class="bg-secondary border-border text-muted-foreground flex aspect-square h-5 w-5 items-center justify-center rounded-full border text-xs"
				>
					{sites.indexOf(site) + 1}
				</div>
				<a
					href={site.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-blue-500 hover:underline"
				>
					{site.name}
				</a>
			</div>
		{/each}
	{/if}

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
		class="bg-gray border-border fixed bottom-0 mx-auto mb-4 flex w-full max-w-xl items-center gap-1 rounded-xl border p-3"
	>
		<textarea
			name="query"
			value={form?.query ?? ''}
			placeholder="Follow up..."
			autocomplete="off"
			rows="1"
			class="w-full text-sm"
			required
		></textarea>
		<button
			type="submit"
			class="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center justify-center gap-x-2 rounded-md transition-colors"
			aria-label="Submit"
		>
			<span class="material-symbols-rounded">send</span>
		</button>
	</div>
</form>
