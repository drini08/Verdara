import dotenv from 'dotenv';

dotenv.config();

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || /^your_/i.test(key) || /\bchangeme\b/i.test(key)) {
    return '';
  }
  return key;
}

function getOutputText(response) {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  const textParts = response.output
    ?.flatMap((item) => item.content || [])
    ?.filter((content) => content.type === 'output_text' && typeof content.text === 'string')
    ?.map((content) => content.text);

  return textParts?.join('\n') || '';
}

export async function generateOpenAiFieldAdvisory(prompt) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'field_advisory',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              recommendations: {
                type: 'array',
                minItems: 3,
                maxItems: 5,
                items: { type: 'string' }
              },
              suitabilityExplanation: { type: 'string' }
            },
            required: ['summary', 'recommendations', 'suitabilityExplanation']
          }
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI advisory failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const outputText = getOutputText(data);
  if (!outputText) {
    throw new Error('OpenAI advisory returned no text output.');
  }

  return JSON.parse(outputText);
}

