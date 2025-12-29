// src/routes/api/private/ai/generate-image-absurd/+server.ts
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { PRIVATE_GEMINI_API_KEY } from '$env/static/private';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GenerateAbsurdImageInputSchema = z.object({
  prompt: z.string().min(5, 'prompt is required')
});

function buildAbsurdPrompt(userPrompt: string): string {
  return `
Create one surreal, absurd, humorous image that is still clearly related to the topic below.

Use strong materiality (glass/steel/velvet/plastic/chrome) and dramatic lighting.
One coherent scene, not a collage.

Topic:
${userPrompt}
`.trim();
}

// Small helper: extract Gemini image part safely
function pickGeminiImagePart(response: any) {
  return response?.candidates?.[0]?.content?.parts?.find(
    (p: any) => p?.inlineData || p?.fileData
  );
}

const genAI = new GoogleGenerativeAI(PRIVATE_GEMINI_API_KEY);
const geminiImageModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image'
});

export async function POST({ request }: RequestEvent) {
  try {
    const body = await request.json().catch(() => null);

    const parsed = GenerateAbsurdImageInputSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          success: false,
          error: 'Invalid request',
          message: parsed.error.issues.map((i) => i.message).join(', ')
        },
        { status: 400 }
      );
    }

    const { prompt } = parsed.data;

    const wrappedPrompt = buildAbsurdPrompt(prompt);

    const result = await geminiImageModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: wrappedPrompt }] }]
    });

    const response = await result.response;
    const imagePart = pickGeminiImagePart(response);

    if (!imagePart) {
      return json(
        {
          success: false,
          error: 'Image generation failed',
          message: 'No image data returned from Gemini image model'
        },
        { status: 502 }
      );
    }

    // Prefer inline base64 if available
    const url = imagePart.inlineData
      ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
      : imagePart.fileData?.fileUri;

    if (!url) {
      return json(
        {
          success: false,
          error: 'Image generation failed',
          message: 'Gemini returned an image part but no inlineData/fileUri'
        },
        { status: 502 }
      );
    }

    return json({ success: true, url });
  } catch (err) {
    console.error('Error in generate-image-absurd (gemini):', err);
    return json(
      {
        success: false,
        error: 'Internal server error',
        message: (err as Error)?.message ?? 'Unknown error'
      },
      { status: 500 }
    );
  }
}
