<script lang="ts">
	import { enhance } from '$app/forms';
	import TabGroup from '$lib/components/tab-group.svelte';
	import Tab from '$lib/components/tab.svelte';
	import Tag from '$lib/components/tag.svelte';
	import Topic from './topic.svelte';
	import nlp from 'compromise';
	import SearchResult from './search-result.svelte';
	import Step from './step.svelte';
	import FollowUp from './follow-up.svelte';

	interface StepData {
		step: string;
		content?: string[];
	}

	interface SiteData {
		title: string;
		url: string;
		description?: string;
	}

	interface TagData {
		name: string;
	}

	interface FollowUpData {
		query: string;
	}

	interface ResponsePart {
		type: 'text' | 'topic';
		content: string;
	}

	let { data, project } = $props();

	let steps = $derived<StepData[]>(
		data.steps.map((step: { title: string; content: string }) => ({
			step: step.title,
			content: JSON.parse(step.content)
		})) || []
	);
	let sites = $derived<SiteData[]>(
		(data.sources || [])
			.filter((source: { type: string }) => source.type === 'web')
			.map((source: { type: string; title: string; url: string; content?: string }) => ({
				title: source.title,
				url: source.url,
				description: source.content || ''
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

	function processInlineMarkdown(text: string): string {
		return text
			.replace(/\n+/g, ' ')
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\s+/g, ' ');
	}

	let nouns = $derived.by(() => {
		if (!response || response === '') return [];

		const doc = nlp(response);
		return doc.nouns().out('array');
	});

	let responseWithNouns = $derived.by(() => {
		if (!response || !nouns || nouns.length === 0) {
			return [{ type: 'text' as const, content: processInlineMarkdown(response) }];
		}

		const parts: ResponsePart[] = [];
		let lastIndex = 0;
		const sortedNouns = Array.isArray(nouns)
			? [...nouns].sort((a, b) => {
					const aIndex = response.indexOf(a);
					const bIndex = response.indexOf(b);
					return aIndex - bIndex;
				})
			: [];

		for (const noun of sortedNouns) {
			const index = response.indexOf(noun, lastIndex);
			if (index !== -1 && index >= lastIndex) {
				if (index > lastIndex) {
					const textContent = response.slice(lastIndex, index);
					parts.push({ type: 'text' as const, content: processInlineMarkdown(textContent) });
				}
				parts.push({ type: 'topic' as const, content: noun });
				lastIndex = index + noun.length;
			}
		}

		if (lastIndex < response.length) {
			const textContent = response.slice(lastIndex);
			parts.push({ type: 'text' as const, content: processInlineMarkdown(textContent) });
		}

		return parts;
	});

	let activeTab = $state('response');

	$effect(() => {
		const cleanupFunctions: (() => void)[] = [];

		if (data.result === null && data.type === 'answer') {
			const eventSource = new EventSource(`/api/answer/${data.threadId}/${data.id}`);

			const handleMessage = (event: MessageEvent) => {
				try {
					const streamData = JSON.parse(event.data);

					switch (streamData.type) {
						case 'steps':
							steps = streamData.content;
							break;

						case 'sources':
							sites = streamData.content;
							break;

						case 'response':
							response = (response || '') + streamData.content;
							break;

						case 'tags':
							tags = streamData.content;
							break;

						case 'follow_ups':
							followUps = streamData.content;
							console.log(followUps);
							break;
						
						case 'title':
							break;

						case 'complete':
							steps = streamData.content.steps || [];
							sites = streamData.content.sources || [];
							response = streamData.content.response || '';
							tags = streamData.content.tags || [];
							followUps = streamData.content.followUps || [];
							eventSource.close();
							break;

						case 'error':
							console.error('Streaming error:', streamData.content);
							eventSource.close();
							break;

						default:
							console.warn('Unknown stream data type:', streamData.type);
					}
				} catch (parseError) {
					console.error('Failed to parse JSON from event:', event.data, parseError);
					if (event.data.includes('error')) {
						console.error('Streaming error: Failed to parse JSON');
						eventSource.close();
					}
				}
			};

			const handleError = () => {
				console.error('EventSource connection error');
				eventSource.close();
			};

			eventSource.addEventListener('message', handleMessage);
			eventSource.addEventListener('error', handleError);

			cleanupFunctions.push(() => {
				eventSource.removeEventListener('message', handleMessage);
				eventSource.removeEventListener('error', handleError);
				eventSource.close();
			});
		} else if (data.result === null && data.type === 'research') {
			const eventSource = new EventSource(`/api/research/${data.threadId}/${data.id}`);

			const handleMessage = (event: MessageEvent) => {
				try {
					const streamData = JSON.parse(event.data);

					switch (streamData.type) {
						case 'steps':
							steps = streamData.content;
							break;

						case 'sources':
							sites = streamData.content;
							console.log('Received sources:', streamData.content);
							break;

						case 'response':
							response = (response || '') + streamData.content;
							break;

						case 'tags':
							tags = streamData.content;
							break;

						case 'follow_ups':
							followUps = streamData.content;
							break;
						
						case 'title':
							break;

						case 'complete':
							steps = streamData.content.steps || [];
							sites = streamData.content.sources || [];
							response = streamData.content.response || '';
							eventSource.close();
							break;

						case 'error':
							console.error('Streaming error:', streamData.content);
							eventSource.close();
							break;

						default:
							console.warn('Unknown stream data type:', streamData.type);
					}
				} catch (parseError) {
					console.error('Failed to parse JSON from event:', event.data, parseError);
					if (event.data.includes('error')) {
						console.error('Streaming error: Failed to parse JSON');
						eventSource.close();
					}
				}
			};

			const handleError = () => {
				console.error('EventSource connection error');
				eventSource.close();
			};

			eventSource.addEventListener('message', handleMessage);
			eventSource.addEventListener('error', handleError);

			cleanupFunctions.push(() => {
				eventSource.removeEventListener('message', handleMessage);
				eventSource.removeEventListener('error', handleError);
				eventSource.close();
			});
		}

		return () => {
			cleanupFunctions.forEach((cleanup) => cleanup());
		};
	});
</script>

<div class="flex w-full flex-col gap-4 mb-16">
	<h1 class="mb-2 text-start text-2xl font-medium">{data.query}</h1>

	<div class="flex flex-wrap gap-x-4 gap-y-1">
		{#each tags as tag}
			<Tag tag={tag.name} {project} />
		{/each}
	</div>

	<div>
		<TabGroup>
			<Tab active={activeTab === 'response'} onclick={() => (activeTab = 'response')}>Response</Tab>
			{#if sites.length > 0}
				<Tab active={activeTab === 'sites'} onclick={() => (activeTab = 'sites')}>Sites</Tab>
			{/if}
		</TabGroup>
	</div>

	{#if activeTab === 'response'}
		{#each steps as step}
			<Step index={steps.indexOf(step) + 1} step={step.step} content={step.content} />
		{/each}
		<div class="flex gap-2">
			<div class="flex h-6 w-5 items-center justify-center">
				<div
					class="border-border text-muted-foreground flex aspect-square h-5 w-5 items-center justify-center rounded-full border text-xs font-extralight"
				>
					{steps.length + 1}
				</div>
			</div>
			<form method="POST" action="?/follow-up" class="m-0 p-0" use:enhance>
				<input type="hidden" name="project" value={project} />
				<input type="hidden" name="threadId" value={data.threadId} />
				<input type="hidden" name="queryId" value={data.id} />
				<div class="response-content">
					{#each responseWithNouns as part}
						{#if part.type === 'text'}
							{@html part.content}
						{:else if part.type === 'topic'}
							<Topic topic={part.content} />
						{/if}
					{/each}
				</div>
			</form>
		</div>
	{:else if activeTab === 'sites'}
		{#each sites as site}
			<div class="flex gap-1">
				<div
					class="bg-secondary border-border text-muted-foreground mt-2 flex aspect-square h-5 w-5 items-center justify-center rounded-full border text-xs"
				>
					{sites.indexOf(site) + 1}
				</div>
				<SearchResult title={site.title} url={site.url} description={site.description} />
			</div>
		{/each}
	{/if}

	{#if data.result !== null}
		<form method="POST" action="?/follow-up" class="m-0 w-full p-0" use:enhance>
			<input type="hidden" name="project" value={project} />
			<input type="hidden" name="threadId" value={data.threadId} />
			<input type="hidden" name="queryId" value={data.id} />
			<div class="flex flex-wrap gap-2">
				{#each followUps as followUp}
					<FollowUp query={followUp.query} />
				{/each}
			</div>
		</form>
	{/if}
</div>

<style>
	.response-content {
		line-height: 1.6;
		display: inline;
	}

	.response-content :global(strong) {
		font-weight: 600;
	}

	.response-content :global(em) {
		font-style: italic;
	}

	.response-content :global(code) {
		background-color: hsl(210, 20%, 98%);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-weight: 500;
		font-family: monospace;
	}
</style>
