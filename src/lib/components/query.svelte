<script lang="ts">
	import { enhance } from '$app/forms';
	import Markdown from '$lib/components/markdown.svelte';
	import TabGroup from '$lib/components/tab-group.svelte';
	import Tab from '$lib/components/tab.svelte';
	import Tag from '$lib/components/tag.svelte';
	import ToolCall from '$lib/components/tool-call.svelte';

	interface SiteData {
		name: string;
		url: string;
	}

	interface ToolCallData {
		name: string;
		input: string;
		output: string | null;
	}

	interface TagData {
		name: string;
	}

	interface FollowUpData {
		query: string;
	}

	let { data, project } = $props();

	let toolCalls = $derived<ToolCallData[]>(
		data.toolCalls.map((toolCall: { name: string; input: any; output: any }) => ({
			name: toolCall.name,
			input: toolCall.input,
			output: toolCall.output
		})) || []
	);
	let response = $derived(data.result || '');
	let tags = $derived<TagData[]>(
		data.tagsToQueries.map((tagToQuery: { tag: { name: string } }) => ({
			name: tagToQuery.tag.name
		})) || []
	);
	let followUps = $derived<FollowUpData[]>(
		data.followUps.map((followUp: { query: string }) => ({
			query: followUp.query
		})) || []
	);
	// let sites = $derived<SiteData[]>(data.sites || []);

	let activeTab = $state('response');
		
	$effect(() => {
		const cleanupFunctions: (() => void)[] = [];

		if (data.result === null) {
			const eventSource = new EventSource(`/api/response/${data.threadId}/${data.id}`);

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === 'tool_request') {
						toolCalls = [
							...toolCalls,
							{
								name: data.content.name,
								input: JSON.stringify(data.content.input),
								output: ''
							}
						];

						if (data.content.name === 'search') {
							// sites.push({
							// 	name: 'Google',
							// 	url: `https://www.google.com/search?q=${encodeURIComponent(data.content.input.query)}`
							// });
						}
					} else if (data.type === 'response') {
						response = (response || '') + data.content;
					} else if (data.type === 'tags') {
						tags = data.content;
					} else if (data.type === 'follow_ups') {
						followUps = data.content;
					} else if (data.type === 'complete') {
						response = data.content.response || '';
						tags = data.content.tags || [];
						followUps = data.content.followUps || [];
						eventSource.close();
					} else if (data.type === 'error') {
						console.error('Streaming error:', data.content);
						eventSource.close();
					}
				} catch (parseError) {
					console.error('Failed to parse JSON from event:', event.data, parseError);
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

		return () => {
			cleanupFunctions.forEach((cleanup) => cleanup());
		};
	});
</script>

<div class="flex w-full flex-col gap-4">
	<h1 class="mb-2 text-start text-2xl font-medium">{data.query}</h1>

	<div class="flex flex-wrap gap-x-4 gap-y-1">
		{#each tags as tag}
			<Tag tag={tag.name} project={project} />
		{/each}
	</div>

	<div>
		<TabGroup>
			<Tab active={activeTab === 'response'} onclick={() => (activeTab = 'response')}>Response</Tab>
			<!-- {#if sites.length > 0}
				<Tab active={activeTab === 'tools'} onclick={() => (activeTab = 'sites')}>Sites</Tab>
			{/if} -->
		</TabGroup>
	</div>

	{#if activeTab === 'response'}
		{#each toolCalls as toolCall}
			<div class="flex items-center gap-2">
				<div
					class="border-border text-muted-foreground flex aspect-square h-5 w-5 items-center justify-center rounded-full border text-xs font-extralight"
				>
					{toolCalls.indexOf(toolCall) + 1}
				</div>
				<ToolCall name={toolCall.name} input={toolCall.input} />
			</div>
		{/each}
		<div class="flex gap-2">
			<div class="flex h-6 w-5 items-center justify-center">
				<div
					class="border-border text-muted-foreground flex aspect-square h-5 w-5 items-center justify-center rounded-full border text-xs font-extralight"
				>
					{toolCalls.length + 1}
				</div>
			</div>
			<Markdown content={response?.toString()} />
		</div>
	{:else if activeTab === 'sites'}
		<!-- {#each sites as site}
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
		{/each} -->
	{/if}

	<form method="POST" action="?/follow-up" class="m-0 w-full p-0" use:enhance>
		<input type="hidden" name="project" value={project} />
		<input type="hidden" name="threadId" value={data.threadId} />
		<input type="hidden" name="queryId" value={data.id} />
		<div class="flex flex-wrap gap-2">
			{#each followUps as followUp}
				<button
					name="query"
					value={followUp.query}
					type="submit"
					class="border-border text-muted-foreground cursor-pointer rounded-xl border px-3 py-1 text-sm font-medium"
					aria-label="Follow up query: {followUp.query}"
				>
					{followUp.query}
				</button>
			{/each}
		</div>
	</form>
</div>
