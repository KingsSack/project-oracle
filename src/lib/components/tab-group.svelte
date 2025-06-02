<script lang="ts">
    let { children } = $props();
</script>

<div class="inline-flex gap-2 bg-background rounded-xl border border-border -m-px p-1">
    {@render children()}
</div>