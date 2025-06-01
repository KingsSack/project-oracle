<script lang="ts">
    let { children } = $props();
</script>

<a href="/" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
    {@render children()}
</a>
