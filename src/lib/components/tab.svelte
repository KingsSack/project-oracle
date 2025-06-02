<script lang="ts">
    let { children, active = false, onclick }: { children: any; active?: boolean; onclick?: () => void } = $props();
</script>

{#if active }
<button class="rounded-lg font-medium text-sm cursor-pointer px-3 h-8 text-foreground border border-border bg-secondary" onclick={onclick}>
    {@render children()}
</button>
{:else}
<button class="rounded-lg font-medium text-sm cursor-pointer px-3 h-8 text-muted-foreground bg-transparent" onclick={onclick}>
    {@render children()}
</button>
{/if}