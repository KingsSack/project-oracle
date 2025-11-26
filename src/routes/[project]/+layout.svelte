<script lang="ts">
	import { page, updated } from '$app/state';
	import '../../app.css';
	import Selector from '$lib/components/selector.svelte';
	import { goto, invalidate } from '$app/navigation';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let projects = $derived(data.projects || []);
	let projectNames = $derived(projects.map((p) => p.name));
	let currentProject = $derived(data.selectedProject || 'default');
	let projectSearch = $state('');
	let isCreating = $state(false);
	let createError = $state('');

	let trimmedProjectSearch = $derived(projectSearch.trim());
	let normalizedProjectSearch = $derived(trimmedProjectSearch.toLowerCase());
	let projectNamesLower = $derived(projectNames.map((name) => name.toLowerCase()));
	let projectAlreadyExists = $derived(
		normalizedProjectSearch && projectNamesLower.includes(normalizedProjectSearch)
	);
	let createDisabled = $derived(!normalizedProjectSearch || projectAlreadyExists);

	function selectProject(project: string) {
		currentProject = project;
		goto(`/${project.toLowerCase()}`);
	}

	async function createProject() {
		if (isCreating || createDisabled) {
			return;
		}

		const projectName = trimmedProjectSearch;
		if (!projectName) {
			return;
		}

		isCreating = true;
		createError = '';

		try {
			const formData = new FormData();
			formData.set('name', projectName);

			const response = await fetch('?/createProject', {
				method: 'POST',
				body: formData
			});

			const body = await response.json().catch(() => ({}));

			if (!response.ok) {
				createError = body?.message ?? 'Unable to create project.';
				return;
			}

			projectSearch = '';
			await invalidate('routes/[project]/+layout');
		} catch (error) {
			console.error('Unable to create project', error);
			createError = 'Unable to create project.';
		} finally {
			isCreating = false;
		}
	}
</script>

<div class="text-foreground">
	<div class="flex w-full items-center justify-between p-2">
		<div>
			<a href="/{page.params.project}" class="text-muted-foreground">
				<span class="material-symbols-rounded">home</span>
			</a>
			<a href="/{page.params.project}/search" class="text-muted-foreground">
				<span class="material-symbols-rounded">search</span>
			</a>
		</div>
		<Selector
			current={currentProject}
			items={['Default', ...projectNames]}
			onSelect={selectProject}
			bind:searchTerm={projectSearch}
		>
			<div class="p-2">
				<button
					type="button"
					class="border-border text-muted-foreground w-full rounded border"
					aria-label="Create Project"
					onclick={createProject}
					disabled={createDisabled || isCreating}
				>
					{isCreating ? 'Creating…' : 'Create Project'}
				</button>
				{#if createError}
					<p style="color: #dc2626; font-size: 0.75rem; margin-top: 0.25rem;">{createError}</p>
				{/if}
			</div>
		</Selector>
		<div class="flex items-center gap-2">
			<a href="/{page.params.project}/settings" class="text-muted-foreground">
				<span class="material-symbols-rounded">settings</span>
			</a>
			<a href="/profile" class="text-muted-foreground">
				<span class="material-symbols-rounded">person</span>
			</a>
		</div>
	</div>

	<div
		class="mx-auto flex min-h-svh w-full max-w-xl flex-col items-center justify-center gap-4 overflow-y-hidden"
	>
		{@render children()}
	</div>

	{#if updated.current}
		<div class="absolute bottom-0 p-2"></div>
	{/if}
</div>

<style>
	:global(.material-symbols-rounded) {
		font-variation-settings:
			'FILL' 0,
			'wght' 400,
			'GRAD' 0,
			'opsz' 24;
	}

	:global(body) {
		font-family: 'JetBrains Mono', monospace;
		color: hsl(223, 70%, 4%);
		background-color: hsl(0, 0%, 100%);
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
