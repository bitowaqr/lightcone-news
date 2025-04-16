import dotenv from 'dotenv';
dotenv.config();

/**
 * Ask Perplexity
 * @param {Object} opts
 * @param {string} opts.model
 * @param {string} opts.systemPrompt
 * @param {string} opts.prompt - required
 * @param {string} opts.contextSize
 */
export const askPerplexity = async (opts) => {
  const {
    model = 'sonar-reasoning-pro',
    systemPrompt = 'You are a helpful AI assistant',
    contextSize = 'high',
    prompt,
  } = opts;


  if (!prompt) {
    throw new Error('prompt is required');
  }

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // model: 'sonar-reasoning-pro',
      // model: 'sonar-deep-research',
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      return_related_questions: true,
      web_search_options: { search_context_size: contextSize },
      // max_tokens: 123,
      // temperature: 0.2,
      // top_p: 0.9,
      // search_domain_filter: ['<any>'],
      // return_images: false,
      // search_recency_filter: '<string>',
      // top_k: 0,
      // stream: false,
      // presence_penalty: 0,
      // frequency_penalty: 1,
      // response_format: {},
      ...opts,
    }),
  };

  const response = await fetch(
    'https://api.perplexity.ai/chat/completions',
    options
  );
  const data = await response.json();
  return data;
};
