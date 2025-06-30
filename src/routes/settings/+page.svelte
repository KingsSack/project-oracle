<script lang="ts">
	import { enhance } from "$app/forms";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();

	interface ModelData {
		id: number;
		model: string;
	}

	let models: ModelData[] = $derived(data.models || []);
	let modelGroups = $derived(data.modelGroups || []);

	let creatingModel = $state(false);
	let creatingModelGroup = $state(false);
</script>

<h1 class="mb-2 text-center text-6xl font-bold">Settings</h1>

{#if form?.error}
	<p>{form.error}</p>
{/if}

<div class="flex w-full flex-col gap-1 p-3">
	<h2 class="text-sm">Models</h2>

	{#each models as model}
		<form method="POST" action="?/delete-model" use:enhance>
			<div class="flex items-center justify-between">
				<input type="hidden" name="id" value={model.id} required />
				<p>{model.model}</p>
				<button type="submit" class="btn btn-secondary cursor-pointer text-muted-foreground"><span class="material-symbols-rounded">delete</span></button>
			</div>
		</form>
	{/each}

	{#if models.length === 0}
		<p class="text-muted-foreground">No models available.</p>
	{/if}

	{#if creatingModel}
		<form method="POST" action="?/add-model" use:enhance>
			<div class="bg-gray border-border flex flex-col space-y-2 rounded-xl border p-6">
				<label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="model">Model</label>
				<input
					type="text"
					name="model"
					placeholder="New Model"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				/>
				<label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="provider">Provider</label>
				<select
					name="provider"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				>
					<option value="googleai">Google</option>
					<option value="openai">OpenAI</option>
					<option value="cohere">Cohere</option>
				</select>

				<button type="submit" class="btn btn-primary cursor-pointer">Add Model</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-secondary cursor-pointer" onclick={() => (creatingModel = true)}>Add Model</button>
	{/if}

	<h2 class="text-sm">Model Groups</h2>

	{#each modelGroups as group}
		<p>{group}</p>
	{/each}

	{#if creatingModelGroup}
		<form method="POST" action="?/add-group">
			<div class="bg-gray border-border flex flex-col space-y-2 rounded-xl border p-6">
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="groupName">Name</label>
				<input
					type="text"
					name="groupName"
					placeholder="New Group Name"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				/>
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="responseModelId">Response Model</label>
				<select
					name="responseModelId"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				>
					{#each models as model}
						<option value={model.id}>{model.model}</option>
					{/each}
				</select>
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="tagsModelId">Tags Model</label>
				<select
					name="tagsModelId"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				>
					{#each models as model}
						<option value={model.id}>{model.model}</option>
					{/each}
				</select>
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="followUpModelId">Follow Up Model</label>
				<select
					name="followUpModelId"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				>
					{#each models as model}
						<option value={model.id}>{model.model}</option>
					{/each}
				</select>
				
				<button type="submit" class="btn btn-primary cursor-pointer">Add Group</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-secondary cursor-pointer" onclick={() => (creatingModelGroup = true)}>Add Model Group</button>
	{/if}
</div>
