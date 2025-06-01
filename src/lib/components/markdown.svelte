<script lang="ts">
    import { marked } from 'marked';
    import katex from 'katex';
    import { createHighlighter } from 'shiki';
    import { onMount } from 'svelte';

    let { content = '' } = $props();
    let renderedHtml = $state('');
    let highlighter: any = null;

    onMount(async () => {
        // Initialize Shiki highlighter once
        highlighter = await createHighlighter({
            themes: ['github-light', 'github-dark'],
            langs: ['javascript', 'typescript', 'python', 'bash', 'json', 'html', 'css', 'sql']
        });
        
        // Configure marked with Shiki
        marked.setOptions({
            highlight: (code, lang) => {
                if (highlighter && lang) {
                    try {
                        return highlighter.codeToHtml(code, {
                            lang,
                            theme: 'github-light'
                        });
                    } catch (e) {
                        return code;
                    }
                }
                return code;
            },
            breaks: true,
            gfm: true
        });

        // Re-render if content exists
        if (content) {
            renderContent();
        }
    });

    function renderContent() {
        if (!content) {
            renderedHtml = '';
            return;
        }
        
        try {
            // Process LaTeX math expressions
            let processedContent = content
                // Block math
                .replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
                    try {
                        return katex.renderToString(math, { displayMode: true });
                    } catch (e) {
                        return `<div class="math-error">LaTeX Error: ${math}</div>`;
                    }
                })
                // Inline math
                .replace(/\$([^\$\n]+?)\$/g, (match, math) => {
                    try {
                        return katex.renderToString(math, { displayMode: false });
                    } catch (e) {
                        return `<span class="math-error">LaTeX Error: ${math}</span>`;
                    }
                });
            
            renderedHtml = marked(processedContent);
        } catch (error) {
            console.error('Markdown rendering error:', error);
            renderedHtml = content;
        }
    }

    $effect(() => {
        // Re-render content whenever it changes, even if highlighter isn't ready yet
        renderContent();
    });

    $effect(() => {
        // Re-render when highlighter becomes available to apply syntax highlighting
        if (highlighter && content) {
            renderContent();
        }
    });
</script>

<svelte:head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
</svelte:head>

<div class="prose prose-sm max-w-none dark:prose-invert">
    {@html renderedHtml}
</div>

<style>
    :global(.prose) {
        color: inherit;
        line-height: 1.6;
    }
    
    :global(.prose pre) {
        margin: 1rem 0;
        border-radius: 0.5rem;
        overflow-x: auto;
    }
    
    :global(.prose code:not(pre code)) {
        background-color: hsl(210, 20%, 98%);
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-size: 0.875em;
        font-weight: 500;
    }
    
    :global(.math-error) {
        color: #ef4444;
        font-family: monospace;
        font-size: 0.875em;
    }
    
    :global(.katex-display) {
        margin: 1rem 0;
    }
</style>