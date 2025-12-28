import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { PRIVATE_OPENAI_API_KEY } from '$env/static/private';
import { z } from 'zod';
import { MAX_TEXT_LENGTH } from '$src/constants/files';
import { zodTextFormat } from 'openai/helpers/zod';
import { LogicalChunkSchema } from '$src/lib/zod/ai';

const openai = new OpenAI({ apiKey: PRIVATE_OPENAI_API_KEY });

const GenerateLogicalChunksInputSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH)
});

/**
 * Return structured chunks (objects) instead of string[].
 * Keep fields minimal so it’s easy to evolve.
 */

const OutputSchema = z.object({
  chunks: z.array(LogicalChunkSchema).min(1)
});

export async function POST({ request }: RequestEvent) {
  try {
    const body = await request.json().catch(() => null);

    const parsed = GenerateLogicalChunksInputSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          success: false,
          error: 'Invalid request',
          message: 'Expected JSON body: { text: string }'
        },
        { status: 400 }
      );
    }

    const transcriptText = parsed.data.text;

    const prompt = `
You are chunking a transcript into logical topic/idea groups.

Rules:
- Output MUST match the JSON schema exactly.
- Preserve original order.
- Cover the entire transcript with no gaps (no missing content).
- No overlap or repetition between chunks.
- Each chunk should be reasonably sized (aim ~1–3 paragraphs).
- Do not invent content.
- Each chunk must include "text".
- "title" and "summary" are optional but helpful; keep them short if you include them.

Transcript:
"""${transcriptText}"""
`.trim();

    const resp = await openai.responses.parse({
      model: 'gpt-5-mini',
      input: [
        {
          role: 'system',
          content:
            'Chunk the transcript into logical topic/idea groups. Return ONLY structured data that matches the schema.'
        },
        { role: 'user', content: prompt }
      ],
      reasoning: { effort: 'minimal' },
      text: {
        format: zodTextFormat(OutputSchema, 'logical_chunks')
      },
      store: false
    });

    const parsedOutput = resp.output_parsed;

    return json({
      success: true,
      chunks: parsedOutput?.chunks ?? []
    });
  } catch (err) {
    console.error('Error in generate-logical-chunks:', err);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
