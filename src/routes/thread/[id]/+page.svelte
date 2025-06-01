<script lang="ts">
	import { enhance } from "$app/forms";
	import TabGroup from "$lib/components/tab-group.svelte";
	import Tab from "$lib/components/tab.svelte";

    let { data, form } = $props();
</script>

{#if form?.error}
    <p>{form.error}</p>
{/if}

<div class="flex flex-col w-full gap-4">
    <h1 class="font-medium text-2xl text-start mb-2">{data.name}</h1>

    <div class="flex gap-4">
        <!-- <a href="/" class="text-xs text-muted-foreground hover:text-foreground transition-colors">Lorem</a> -->
        <!-- <a href="/" class="text-xs text-muted-foreground hover:text-foreground transition-colors">Ipsum</a> -->
    </div>

    <TabGroup>
        <Tab active={true}>Response</Tab>
        <!-- <Tab>Sites</Tab> -->
        <!-- <Tab>Images</Tab> -->
    </TabGroup>

    <p>{data.result}</p>

    <div class="flex gap-2">
        <button class="rounded-xl border border-border px-3 py-1 text-sm font-medium text-muted-foreground cursor-pointer" aria-label="Lorem">Lorem</button>
        <button class="rounded-xl border border-border px-3 py-1 text-sm font-medium text-muted-foreground cursor-pointer" aria-label="Ipsum">Ipsum</button>
    </div>
</div>

<div class="flex flex-col gap-4 align-end text-end justify-center absolute right-0 mr-2">
    <!-- <a href="/" class="text-sm font-light">Test</a>
    <a href="/" class="text-sm font-medium">Lorem Ipsum</a> -->
</div>

<form method="POST" action="?/query" class="w-full m-0 p-0" use:enhance>
    <div class="flex flex-col gap-1 w-full bg-gray border border-border rounded-xl p-3 absolute bottom-0 mx-auto mb-4 max-w-xl">
        <textarea 
            name="query"
            value={form?.query ?? ''}
            placeholder="Follow up..." 
            autocomplete="off" 
            rows="1" 
            class="text-sm"
            required
        ></textarea>
    </div>
</form>