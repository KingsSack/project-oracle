<script lang="ts">
	let { index, step, content, isLast, hasResponse }: { index: number; step: string; content?: string[]; isLast?: boolean; hasResponse?: boolean } = $props();

	let collapsed: boolean = $state(hasResponse ? true : !(isLast ?? false));

	$effect(() => {
		if (hasResponse) collapsed = true;
	});

	function toggle() {
		collapsed = !collapsed;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle();
		}
	}

	function processInlineMarkdown(text: string): string {
		return text
			.replace(/\n+/g, ' ')
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\s+/g, ' ');
	}
</script>

<div class="flex items-center gap-2 cursor-pointer" role="button" tabindex="0" onclick={toggle} onkeydown={onKeydown} aria-expanded={!collapsed}>
	<div
		class="border-border text-muted-foreground flex aspect-square h-5 w-5 items-center justify-center rounded-full border text-xs font-extralight"
	>
		{index}
	</div>
	<div class="text-muted-foreground text-sm">{step}</div>
</div>
{#if !collapsed && content && content.length > 0}
	<ul class="flex w-full flex-col gap-4">
		{#each content as item}
			{#if item && item.length > 0}
				<li class="text-muted-foreground text-xs font-light">
					{processInlineMarkdown(item)}
				</li>
			{/if}
		{/each}
	</ul>
{/if}
