<script lang="ts">
	import { page, updated } from '$app/state';
	import '../../app.css';
	import Selector from '$lib/components/selector.svelte';
	import { goto } from '$app/navigation';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let projects = $derived(data.projects || []);
	let projectNames = $derived(projects.map((p) => p.name));
	let currentProject = $derived(data.selectedProject || 'Default');

	function selectProject(project: string) {
		currentProject = project;
		const id = projects.find((p) => p.name === project)?.id;
		if (id) goto(`/project/${id}`);
		else goto(`/project/0`);
	}
</script>

<div class="text-foreground">
	<div class="flex items-center justify-between w-full p-2">
		<div>
			<a href="/{page.params.project}" class="text-muted-foreground">
				<span class="material-symbols-rounded">home</span>
			</a>
			<a href="/{page.params.project}/search" class="text-muted-foreground">
				<span class="material-symbols-rounded">search</span>
			</a>
		</div>
		<Selector current={currentProject} items={['Default', ...projectNames]} onSelect={selectProject} />
		<div class="flex items-center gap-2">
			<a href="/{page.params.project}/settings" class="text-muted-foreground">
				<span class="material-symbols-rounded">settings</span>
			</a>
			<a href="/profile" class="text-muted-foreground">
				<span class="material-symbols-rounded">person</span>
			</a>
		</div>
	</div>

	<div class="flex flex-col items-center justify-center min-h-svh w-full max-w-xl mx-auto gap-4 overflow-y-hidden">
		{@render children()}
	</div>

	{#if updated.current}
		<div class="absolute bottom-0 p-2">

		</div>
	{/if}
</div>

<style>
	:global(.material-symbols-rounded) {
		font-variation-settings:
		'FILL' 0,
		'wght' 400,
		'GRAD' 0,
		'opsz' 24
	}

	:global(body) {
		font-family: 'JetBrains Mono', monospace;
		color: hsl(223, 70%, 4%);
		background-color: hsl(0, 0%, 100%)
	}

	:global(.border-border) {
		border-color: hsl(0, 0%, 89.8%);
	}
	:global(.border-input) {
		border-color: hsl(0, 0%, 84.8%);
	}
	:global(.bg-background) {
		background-color: hsl(0, 0%, 100%);
	}
	:global(.bg-secondary) {
		background-color: hsl(210, 20%, 98%);
	}
	:global(.bg-muted) {
		background-color: hsl(210, 20%, 96%);
	}
	:global(.text-foreground) {
		color: hsl(223, 70%, 4%);
	}
	:global(.text-muted-foreground) {
		color: hsl(211, 11%, 45%);
	}


	:global(.bg-gray) {
		background-color: hsl(0, 0%, 99%);
	}

	:global(html) {
		scroll-behavior: smooth;
	}
</style>
