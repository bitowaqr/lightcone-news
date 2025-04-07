import MarkdownIt from 'markdown-it';
import mila from 'markdown-it-link-attributes';
import { computed } from 'vue';

export function useMarkdown() {
    const md = new MarkdownIt({
        html: true,        // Enable HTML tags in source
        linkify: true,     // Autoconvert URL-like text to links
        typographer: true  // Enable some language-neutral replacement + quotes beautification
    });

    // Add plugin for link attributes
    md.use(mila, {
        pattern: /^https?:\/\//, // Only apply to external links
        attrs: {
            target: '_blank',
            rel: 'noopener noreferrer'
        }
    });

    const render = (markdownString: string | undefined | null): string => {
        if (!markdownString) {
            return '';
        }
        return md.render(markdownString);
    };

    return {
        render
    };
}

export const renderMarkdown = (content) => {
    const { render } = useMarkdown();
    return computed(() => {
        if(!content) return '';
        return render(content);
    });
}
