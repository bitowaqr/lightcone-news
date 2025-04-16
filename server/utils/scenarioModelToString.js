export const scenarioToMarkdown = (scenario) => {
    
    if (!scenario || typeof scenario !== 'object') return '';
    

    const { _id, question, description, tags, platform, scenarioData, distance } = scenario;
    const { volume, liquidity } = scenarioData || {};

    let markdown = `# Scenario: ${question || 'Untitled'}\n\n`;
    markdown += `## Metadata\n`;
    markdown += `- _id: ${_id}\n`;
    markdown += `- Distance to article:\n${distance !== null ? distance : 'Not specified'}\n`;
    markdown += `- Platform:\n${platform || 'Not specified.'}\n`;
    markdown += `- Volume:\n${volume !== null ? volume : 'Not specified'}\n`;
    markdown += `- Liquidity:\n${liquidity !== null ? liquidity : 'Not specified'}\n`;
    markdown += `\n`;
    markdown += `## Description:\n${description || 'No description available.'}\n\n`;
    markdown += `## Tags:\n${tags && tags.length > 0 ? tags.join(', ') : 'No tags available.'}`;
    return markdown;
};

export const scenariosToMarkdown = (scenarios) => {
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
        return '';
    }
    return scenarios.map(scenarioToMarkdown).join('\n\n');
};



