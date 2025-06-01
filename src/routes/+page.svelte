<script lang="ts">
	import { enhance } from "$app/forms";
	import Card from "$lib/components/card.svelte";
	import Selector from "$lib/components/selector.svelte";
	import TabGroup from "$lib/components/tab-group.svelte";
	import Tab from "$lib/components/tab.svelte";
	import { onMount } from "svelte";

    let { data, form } = $props();

	onMount(() => {
	});
</script>

<h1 class="font-bold text-6xl text-center mb-2">Project Oracle</h1>

{#if form?.error}
    <p>{form.error}</p>
{/if}

<form method="POST" action="?/query" class="w-full m-0 p-0" use:enhance>
    <div class="flex flex-col gap-1 w-full bg-gray border border-border rounded-xl p-3">
        <textarea 
            name="query"
            placeholder="Find what you are looking for..." 
            autocomplete="off" 
            rows="7" 
            class="text-sm"
            required
        ></textarea>
        <div class="flex justify-between gap-2">
            <TabGroup>
                <Tab active={true}>Answer</Tab>
                <Tab>Research</Tab>    
            </TabGroup>
            <div class="flex gap-3">
                <Selector current = "Web" />
                <Selector current = "All" />
                <button
                    type="submit"
                    class="rounded-md inline-flex items-center justify-center cursor-pointer gap-x-2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Submit"
                >
                    <span class="material-symbols-rounded">send</span>
                </button>
            </div>
        </div>
    </div>
</form>

<div class="grid grid-cols-3 grid-rows-2 gap-4 overflow-hidden w-full">
    {#each data.projects as project}
        <Card title={project.name} image={project.image} />
    {/each}
</div>