<script lang="ts">
	import type { PageProps } from './$types';
	import Query from '$lib/components/query.svelte';
	import ThreadNav from '$lib/components/thread-nav.svelte';
	import FollowUpInput from '$lib/components/follow-up-input.svelte';

	let { data, form }: PageProps = $props();
</script>

{#if form?.error}
	<p>{form.error}</p>
{/if}

<Query data={data.query} project={data.currentProject} />

<ThreadNav queries={data.queries} queryId={data.query.id} project={data.currentProject} />

<FollowUpInput threadId={data.query.threadId} queryId={data.query.id} project={data.currentProject} {form} />
