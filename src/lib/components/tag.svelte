<script lang="ts">
    let { tag, project } = $props();
</script>

<a href="/{project.toLowerCase()}/search?tags={tag}" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
    {tag}
</a>
