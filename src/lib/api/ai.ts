import type { ApiResponseWithData, ApiResponse} from '$lib/types/api';

export async function generateTranscript(audioFile: File): Promise<ApiResponseWithData<{
    text: string,
    words: string[],
    segments: any[]
}>> {
    const endpoint = '/api/private/ai/generate-transcript';

    try {

        const response = await fetch(endpoint, {
            method: 'POST',
            body: (() => {
                const formData = new FormData();
                formData.append('audio', audioFile);
                return formData;
            })()
        });

        console.log('Response:', response);

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Failed to generate transcript',
                message: data.message
            };
        }

        if (!data.success) {
            return {
                success: false,
                error: data.error || 'Failed to generate transcript',
                message: data.message
            };
        }

        return {
            success: true,
            data: {
                text: data.text ?? '',
                words: data.words ?? [],
                segments: data.segments ?? [],
            }
        };

    } catch (error) {
        return {
            success: false,
            error: (error as Error).message || 'An unknown error occurred',
        };
    }
}


export type LogicalChunk = {
  title?: string;
  summary?: string;
  text?: string;        // optional if your backend returns text per chunk
  segmentStart?: number;
  segmentEnd?: number;
};

export async function generateLogicalChunks(
  transcriptText: string
): Promise<ApiResponseWithData<{ chunks: LogicalChunk[] }>> {
  const endpoint = '/api/private/ai/generate-logical-chunks';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: transcriptText })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to generate logical chunks',
        message: data.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to generate logical chunks',
        message: data.message
      };
    }

    return {
      success: true,
      data: {
        chunks: data.chunks ?? []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'An unknown error occurred'
    };
  }
}

export type ModelRoute = 'TECHNICAL' | 'NARRATIVE' | 'ARTISTIC';

export type EnrichedLogicalChunk = LogicalChunk & {
  chunkIndex: number;
  prompt: string;
  promptType: ModelRoute;
  imageB64?: string | null;
};

export type MediaPrompt = {
  /** Index of the chunk this prompt corresponds to */
  chunkIndex: number;

  /** The actual prompt you’ll send to gpt-image-1 (or other image model) */
  prompt: string;

  /** Optional: can be useful for UI/debugging */
  title?: string;
};

export async function createMediaPrompts(
  chunks: LogicalChunk[]
): Promise<ApiResponseWithData<{ enrichedChunks: EnrichedLogicalChunk[] }>> {
  const endpoint = '/api/private/ai/create-media-prompts';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to create media prompts',
        message: data.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to create media prompts',
        message: data.message
      };
    }

    return {
      success: true,
      data: {
        // Expecting backend to return { enrichedChunks: [...] }
        enrichedChunks: data.enrichedChunks ?? []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'An unknown error occurred'
    };
  }
}

export async function generateImage(
  prompt: string
): Promise<ApiResponseWithData<{ url: string }>> {
  const endpoint = '/api/private/ai/generate-image';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to generate image',
        message: data.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to generate image',
        message: data.message
      };
    }

    return {
      success: true,
      data: {
        // backend should return { url: string }
        url: data.url ?? ''
      }
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'An unknown error occurred'
    };
  }
}
