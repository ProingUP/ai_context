import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { PRIVATE_GEMINI_API_KEY, PRIVATE_OPENAI_API_KEY } from '$env/static/private';
import { GenerateImageInputSchema } from '$src/lib/zod/ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

type ModelRoute = 'TECHNICAL' | 'NARRATIVE' | 'ARTISTIC';

// OpenAI (TECHNICAL)
const openai = new OpenAI({ apiKey: PRIVATE_OPENAI_API_KEY });

// Gemini (NARRATIVE)
const genAI = new GoogleGenerativeAI(PRIVATE_GEMINI_API_KEY);
const geminiImageModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image'
});

// Small helper: extract Gemini image part safely
function pickGeminiImagePart(response: any) {
  return response?.candidates?.[0]?.content?.parts?.find(
    (p: any) => p?.inlineData || p?.fileData
  );
}

export async function POST({ request }: RequestEvent) {
  try {
    const body = await request.json().catch(() => null);

    const parsed = GenerateImageInputSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        {
          success: false,
          error: 'Invalid request',
          message: 'Expected JSON body: { prompt: string, type?: TECHNICAL|NARRATIVE|ARTISTIC }'
        },
        { status: 400 }
      );
    }

    const { prompt } = parsed.data;
    const type = (parsed.data as any).type as ModelRoute; // if using default in schema, this will always exist

    // Route
    if (type === 'TECHNICAL') {
      // OpenAI gpt-image-1: return base64 and convert to data URL
      const img = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        // optional knobs:
        // size: '1024x1024',
      });

      const b64 = img.data?.[0]?.b64_json;
      if (!b64) {
        return json(
          {
            success: false,
            error: 'Image generation failed',
            message: 'No base64 returned from gpt-image-1'
          },
          { status: 502 }
        );
      }

      // gpt-image-1 typically returns PNG base64
      const url = `data:image/png;base64,${b64}`;
      return json({ success: true, url, route: type });
    }

    if (type === 'ARTISTIC') {
      // TODO: Plug FLUX.2 Pro here.
      // Depending on provider (Replicate/Fal/Modal/etc) you’ll call their API
      // and either return a URL or base64 and normalize to data URL.
      return json(
        {
          success: false,
          error: 'Not implemented',
          message: 'ARTISTIC routing (FLUX.2 Pro) is not wired up yet'
        },
        { status: 501 }
      );
    }

    // Default: NARRATIVE → Gemini
    const wrappedPrompt = `
${prompt}

TEXT RULES:
- Only render text inside TEXT_TO_RENDER_EXACTLY, spelled exactly.
- Large sans-serif for labels. No extra words.
`.trim();

    const result = await geminiImageModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: wrappedPrompt }] }]
      // If your SDK supports generationConfig for image modality, add it here
      // generationConfig: { ... }
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

    return json({ success: true, url, route: type });
  } catch (err) {
    console.error('Error in generate-image:', err);
    return json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
