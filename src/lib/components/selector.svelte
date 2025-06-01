<script lang="ts">
    let { current } = $props();
</script>

<button class="rounded-md inline-flex items-center justify-center cursor-pointer gap-x-2 text-muted-foreground">
    <p class="text-sm text-foreground">{current}</p>
    <span class="material-symbols-rounded">unfold_more</span>
</button>