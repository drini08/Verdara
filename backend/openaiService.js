import dotenv from 'dotenv';

dotenv.config();

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

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

export async function generateMarketplaceItemImage(title, description) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    console.log('No OpenAI API key — skipping marketplace image generation.');
    return null;
  }

  const prompt = `A beautiful, high-quality photograph of fresh ${title}. Agricultural marketplace style, clean white background with soft natural lighting, vibrant colors. ${description ? description.slice(0, 100) : ''}`.trim();

  try {
    const response = await fetch(OPENAI_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'auto'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DALL-E image generation failed: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    let imageUrl = data?.data?.[0]?.url;
    
    if (!imageUrl && data?.data?.[0]?.b64_json) {
      imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
    }

    if (!imageUrl) {
      console.error('DALL-E returned no image URL or base64 data.');
      return null;
    }

    return imageUrl;
  } catch (err) {
    console.error('Error generating marketplace image:', err.message);
    return null;
  }
}
