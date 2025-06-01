<script lang="ts">
    let { title, image, alt = title  } = $props();
</script>

<div class="flex flex-col gap-2 w-full border border-border rounded-xl p-3">
    <img src={image} {alt} class="rounded-xl w-full h-18 object-cover" />
    <h2 class="text-sm font-light">{title}</h2>
</div>