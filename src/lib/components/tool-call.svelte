<script lang="ts">
	interface ToolCall {
		name: string;
		input: any;
		output?: any;
		status?: 'pending' | 'complete' | 'error';
	}

	let { toolCall }: { toolCall: ToolCall } = $props();

	function formatInput(input: any): string {
		if (typeof input === 'string') return input;
		return JSON.stringify(input, null, 2);
	}

	function formatOutput(output: any): string {
		if (typeof output === 'string') return output;
		return JSON.stringify(output, null, 2);
	}
</script>

<div class="border-border bg-muted/50 rounded-lg border p-3 text-sm">
	<div class="flex items-center gap-2 mb-2">
		<span class="material-symbols-rounded text-lg">build</span>
		<span class="font-medium">{toolCall.name}</span>
		{#if toolCall.status === 'pending'}
			<div class="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
		{:else if toolCall.status === 'complete'}
			<span class="material-symbols-rounded text-green-600 text-lg">check_circle</span>
		{:else if toolCall.status === 'error'}
			<span class="material-symbols-rounded text-red-600 text-lg">error</span>
		{/if}
	</div>
	
	{#if toolCall.input}
		<div class="mb-2">
			<div class="text-muted-foreground text-xs font-medium mb-1">Input:</div>
			<div class="bg-background rounded px-2 py-1 text-xs font-mono break-all">
				{formatInput(toolCall.input)}
			</div>
		</div>
	{/if}
	
	{#if toolCall.output}
		<div>
			<div class="text-muted-foreground text-xs font-medium mb-1">Output:</div>
			<div class="bg-background rounded px-2 py-1 text-xs font-mono break-all max-h-32 overflow-y-auto">
				{formatOutput(toolCall.output)}
			</div>
		</div>
	{/if}
</div>
