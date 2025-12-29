// src/routes/api/private/ai/create-media-prompts/+server.ts
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { PRIVATE_OPENAI_API_KEY } from '$env/static/private';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

import { CreateMediaPromptsInputSchema, LogicalChunkSchema } from '$src/lib/zod/ai';

const openai = new OpenAI({ apiKey: PRIVATE_OPENAI_API_KEY });

type LogicalChunk = z.infer<typeof LogicalChunkSchema>;

type EnrichedLogicalChunk = LogicalChunk & {
  chunkIndex: number;
  prompt: string; // the actual prompt text you send to your image model
};

export async function POST({ request }: RequestEvent) {
  try {
    const body = await request.json().catch(() => null);

    const parsed = CreateMediaPromptsInputSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          success: false,
          error: 'Invalid request',
          message: 'Expected JSON body: { chunks: LogicalChunk[] }'
        },
        { status: 400 }
      );
    }

    const chunks = parsed.data.chunks;

    const chunkPayload = chunks.map((c, i) => ({
      index: i,
      title: c.title ?? '',
      summary: c.summary ?? '',
      text: c.text ?? '',
      segmentStart: c.segmentStart ?? null,
      segmentEnd: c.segmentEnd ?? null
    }));

    const mode = 'ABSURD';

    const userPrompt = `
You are generating image prompts for a podcast visualizer.

Mode: ${mode}

GLOBAL RULES:
- Output ONE prompt per chunk.
- Prompt text: 2–3 descriptive sentences. Start with the main subject.
- Always include materiality (glass, steel, velvet, paper, plastic, chrome, etc.) + lighting.
- NO readable text in the image: no words, letters, numbers, symbols, captions, logos, watermarks.
- Avoid objects that commonly contain text: signs, posters, books, screens, dashboards, whiteboards, sticky notes.
- Avoid copyrighted characters/logos.
- Do NOT mention brand names or real people’s names unless they are explicitly in the chunk text.

ABSURD MODE RULES:
1) Silently identify 3–6 topic anchors from the chunk. These MUST be visible in the final image.
2) At least TWO anchors must be dominant central objects (not tiny background references).
3) Apply 2–4 absurd transformations (anthropomorphism, scale swap, impossible physics, category mashup, literal metaphor, surreal props).
4) One coherent scene, not a collage.
5) Safe for work.

CHUNKS:
${JSON.stringify(chunkPayload)}

Return JSON that matches the schema exactly.
`.trim();

    // Only "text" now — no type, no labels
    const OutputSchema = z.object({
      prompts: z
        .array(
          z.object({
            text: z.string().min(1)
          })
        )
        .length(chunks.length)
    });

    const resp = await openai.responses.parse({
      model: 'gpt-5-mini',
      input: [
        {
          role: 'system',
          content: 'Return ONLY structured JSON that matches the schema.'
        },
        { role: 'user', content: userPrompt }
      ],
      reasoning: { effort: 'medium' },
      text: {
        format: zodTextFormat(OutputSchema, 'media_prompts')
      },
      store: false
    });

    const parsedOutput = resp.output_parsed;
    const prompts = parsedOutput?.prompts ?? [];

    if (!Array.isArray(prompts) || prompts.length !== chunks.length) {
      return json(
        {
          success: false,
          error: 'Model output mismatch',
          message: `Expected ${chunks.length} prompts, got ${prompts?.length ?? 0}`
        },
        { status: 502 }
      );
    }

    const enrichedChunks: EnrichedLogicalChunk[] = chunks.map((chunk, i) => {
      const p = prompts[i] ?? { text: '' };

      const finalPrompt = (p.text ?? '').trim() || 'Surreal absurd scene, no text.';

      return {
        ...chunk,
        chunkIndex: i,
        prompt: finalPrompt
      };
    });

    return json({
      success: true,
      enrichedChunks
    });
  } catch (err) {
    console.error('Error in create-media-prompts:', err);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
