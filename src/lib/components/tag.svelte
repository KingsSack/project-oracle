<script lang="ts">
    let { tag } = $props();
</script>

<a href="/search?tags={tag}" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
    {tag}
</a>
