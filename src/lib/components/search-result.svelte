<script lang="ts">
    let { title, url, description } = $props();

    function goToUrl() {
        if (url) {
            window.open(url, '_blank');
        }
    }
</script>

<button onclick={goToUrl} class="flex flex-col gap-1 p-2 rounded-md text-start cursor-pointer hover:bg-gray-100 transition-colors">
    <p class="text-sm font-medium">{title}</p>
    <p class="text-xs text-muted-foreground">
        {url.length > 50 ? url.slice(0, 50) + '...' : url}
    </p>
    {#if description}
        <p class="text-sm">{description}</p>
    {/if}
</button>