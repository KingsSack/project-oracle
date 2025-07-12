<script lang="ts">
	import { enhance } from '$app/forms';

	let { threadId, queryId, project, form } = $props();

	let formElement: HTMLFormElement;
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			formElement.requestSubmit();
		}
	}
</script>

<form method="POST" action="?/follow-up" class="m-0 w-full p-0" use:enhance bind:this={formElement}>
	<input type="hidden" name="project" value={project} />
	<input type="hidden" name="threadId" value={threadId} />
	<input type="hidden" name="queryId" value={queryId} />
	<div
		class="bg-gray border-border fixed bottom-0 mx-auto mb-4 flex w-full max-w-xl items-center gap-1 rounded-xl border p-3"
	>
		<textarea
			name="query"
			value={form?.query ?? ''}
			placeholder="Follow up..."
			autocomplete="off"
			rows="1"
			class="w-full text-sm"
			required
			onkeydown={handleKeyDown}
		></textarea>
		<button
			type="submit"
			class="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center justify-center gap-x-2 rounded-md transition-colors"
			aria-label="Submit"
		>
			<span class="material-symbols-rounded">send</span>
		</button>
	</div>
</form>
