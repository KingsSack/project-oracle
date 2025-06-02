<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Markdown from '$lib/components/markdown.svelte';
	import TabGroup from '$lib/components/tab-group.svelte';
	import Tab from '$lib/components/tab.svelte';
	import Tag from '$lib/components/tag.svelte';
	import ToolCall from '$lib/components/tool-call.svelte';
	import { onMount } from 'svelte';

	interface ToolCallData {
		id: string;
		name: string;
		input: any;
		output?: any;
		status: 'pending' | 'complete' | 'error';
	}

	let { data, form }: { data: any; form: any } = $props();
	let response = $state(data.result || '');
	let tags = $state(data.tags);
	let toolCalls = $state<ToolCallData[]>([]);
	let activeTab = $state('response');

	onMount(() => {
		const cleanupFunctions: (() => void)[] = [];

		if (data.result === null) {
			const eventSource = new EventSource(`/api/response/${page.params.id}`);

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === 'tool_request') {
						// Add or update tool call
						const toolCall: ToolCallData = {
							id: `${data.content.name}-${Date.now()}`,
							name: data.content.name,
							input: data.content.input,
							status: 'pending'
						};
						toolCalls = [...toolCalls, toolCall];
					} else if (data.type === 'tool_response') {
						// Update the corresponding tool call with the output
						const toolResponse = data.content;
						toolCalls = toolCalls.map(tc => {
							if (tc.name === toolResponse.name && tc.status === 'pending') {
								return { ...tc, output: toolResponse.output, status: 'complete' as const };
							}
							return tc;
						});
					} else if (data.type === 'chunk') {
						response = (response || '') + data.content;
					} else if (data.type === 'complete') {
						response = data.content;
						// Mark any pending tool calls as complete
						toolCalls = toolCalls.map(tc => ({ ...tc, status: 'complete' as const }));
						eventSource.close();
					} else if (data.type === 'error') {
						console.error('Streaming error:', data.content);
						// Mark any pending tool calls as error
						toolCalls = toolCalls.map(tc => ({ ...tc, status: 'error' as const }));
						eventSource.close();
					}
				} catch (parseError) {
					console.error('Failed to parse JSON from event:', event.data, parseError);
					// Try to extract any readable error message
					if (event.data.includes('error')) {
						console.error('Streaming error: Failed to parse JSON');
						toolCalls = toolCalls.map(tc => ({ ...tc, status: 'error' as const }));
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
			cleanupFunctions.forEach(cleanup => cleanup());
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
			<Tab active={activeTab === 'response'} onclick={() => activeTab = 'response'}>Response</Tab>
			<Tab active={activeTab === 'tools'} onclick={() => activeTab = 'tools'}>
				Tools {toolCalls.length > 0 ? `(${toolCalls.length})` : ''}
			</Tab>
		</TabGroup>
	</div>

	{#if activeTab === 'response'}
		{#each toolCalls as toolCall}
			<div class="flex gap-2">
				<div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
					<span class="material-symbols-rounded text-xs">
						{#if toolCall.status === 'pending'}
							autorenew
						{:else if toolCall.status === 'complete'}
							check_circle
						{:else if toolCall.status === 'error'}
							error
						{/if}
					</span>
				</div>
				<ToolCall {toolCall} />
			</div>
		{/each}
		<div class="flex gap-2">
			<div class="w-6 h-6 bg-gray-200 flex items-center justify-center text-xs aspect-square rounded-full">
				{toolCalls.length + 1}
			</div>
			<Markdown content={response?.toString()} />
		</div>
	{:else if activeTab === 'tools'}
		<div class="flex flex-col gap-3">
			{#if toolCalls.length === 0}
				<div class="text-muted-foreground text-center py-8">
					No tool calls yet
				</div>
			{:else}
				{#each toolCalls as toolCall}
					<ToolCall {toolCall} />
				{/each}
			{/if}
		</div>
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
