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

    // Store the original rule, if it exists
    const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        // Get the link text token which is usually the next token after link_open
        const textToken = tokens[idx + 1];

        if (textToken && textToken.type === 'text' && textToken.content.length > 50) {
            // Truncate the link text
            const originalText = textToken.content;
            textToken.content = originalText.substring(0, 50) + '...';
        }

        // Call the original rule or the default if no original rule was found.
        return defaultRender(tokens, idx, options, env, self);
    };

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
