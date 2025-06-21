<script lang="ts">
	let { data }: { data: any } = $props();

	let modelGroups = data.modelGroups || [];

	let addingModel = $state(false);
</script>

<h1 class="mb-2 text-center text-6xl font-bold">Settings</h1>

<div class="flex w-full flex-col gap-1 p-3">
	<h2 class="text-sm">Model Groups</h2>

	{#each modelGroups as group}
		<p>{group}</p>
	{/each}

	{#if addingModel}
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
				<input
					type="text"
					name="responseModel"
					placeholder="Response Model"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				/>
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="tagsModel">Tags Model</label>
				<input
					type="text"
					name="tagsModel"
					placeholder="Tags Model"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				/>
                <label class="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm leading-5" for="followUpModel">Follow Up Model</label>
				<input
					type="text"
					name="followUpModel"
					placeholder="Follow Up Model"
					class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-2 py-1 text-sm leading-5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				/>
				<button type="submit" class="btn btn-primary">Add Group</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-secondary" onclick={() => (addingModel = true)}>Add Model Group</button>
	{/if}
</div>
