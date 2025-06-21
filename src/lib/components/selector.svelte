<script lang="ts">
    let { current, items = [], onSelect } = $props();
    let isOpen = $state(false);

    function selectItem(item: string) {
        onSelect?.(item);
        isOpen = false;
    }

    function toggleDropdown() {
        isOpen = !isOpen;
    }
</script>

<div class="relative">
    <button 
        class="rounded-md inline-flex items-center justify-center gap-x-1 cursor-pointer text-muted-foreground"
        onclick={toggleDropdown}
    >
        <p class="text-sm text-foreground">{current}</p>
        <span class="material-symbols-rounded hover:opacity-80 transition-opacity">
            {isOpen ? 'unfold_less' : 'unfold_more'}
        </span>
    </button>

    {#if isOpen}
        <div class="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-full">
            {#each items as item}
                <button
                    class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                    onclick={() => selectItem(item)}
                >
                    {item}
                </button>
            {/each}
        </div>
    {/if}
</div>