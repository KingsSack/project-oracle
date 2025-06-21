<script lang="ts">
	let { data, form }: { data: any, form: any } = $props();

	let models = data.models || [];
	let modelGroups = data.modelGroups || [];

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
		<p>{model}</p>
	{/each}

	{#if models.length === 0}
		<p class="text-muted-foreground">No models available.</p>
	{/if}

	{#if creatingModel}
		<form method="POST" action="?/add-model">
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

				<button type="submit" class="btn btn-primary">Add Model</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-secondary" onclick={() => (creatingModel = true)}>Add Model</button>
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
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="responseModel">Response Model</label>
				<select
					name="responseModel"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				>
					{#each models as model}
						<option value={model}>{model}</option>
					{/each}
				</select>
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="tagsModel">Tags Model</label>
				<select
					name="tagsModel"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				>
					{#each models as model}
						<option value={model}>{model}</option>
					{/each}
				</select>
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="followUpModel">Follow Up Model</label>
				<select
					name="followUpModel"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				>
					{#each models as model}
						<option value={model}>{model}</option>
					{/each}
				</select>
				
				<button type="submit" class="btn btn-primary">Add Group</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-secondary" onclick={() => (creatingModelGroup = true)}>Add Model Group</button>
	{/if}
</div>
