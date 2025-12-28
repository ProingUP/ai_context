<script lang='ts'>
	import { createMediaPrompts, generateImage, generateLogicalChunks, generateTranscript, type EnrichedLogicalChunk, type LogicalChunk } from "$lib/api/ai";
	import Loading from "$src/constants/loading/Loading.svelte";

    type EnrichedChunkWithImage = EnrichedLogicalChunk & {
        imageUrl?: string | null;
        imageStatus?: 'idle' | 'generating' | 'done' | 'error';
        imageError?: string | null;
    };

    // TEST DATA
    const FINAL_TRANSCRIPT = `Do you think the scaling laws are holding strong on, um, there's a lot of ways to describe the scaling laws for AI, but on the pre-training on the post-training fronts. So the flip side of that, do you anticipate AI progress will hit a wall? Is there a wall? You know, it's a cherished micro kitchen conversation. Once in a while I have it, uh, you know, like when Demis is visiting or, you know, if Demis, Cori, Jeff, Noam, Sergey, a bunch of our people, like we sit and, uh, you know, you know, talk about this. Right. And, um, look, I, we see a lot of headroom ahead, right. I think, uh, we've been able to optimize and improve on all fronts, right. Uh, pre-training, post-training, test time, compute, tool use, right over time, making these more agentic. So getting these models to be more general world models in that direction, like VO3, uh, you know, the physics understanding is dramatically better than what VO1 or something like that was. So you kind of see on all those dimensions, I, I feel, you know, progress is very obvious to see, and I feel like there is significant headroom. More importantly, you know, I'm fortunate to work with some of the best researchers on the planet. Right. They think, uh, there is more headroom to be had here. Uh, and so I think we have an exciting trajectory ahead. It's tougher to say, you know, each year I sit and say, okay, we are going to throw 10X more compute over the course of next year at it, and like, will we see progress? Sitting here today, I feel like the year ahead will have a lot of progress. And do you feel any limitations like, uh, that, or the bottlenecks, compute limited, uh, data limited, idea limited, do you feel any of those limitations or is it full steam ahead on all fronts? I think it's compute limited in this sense, right? Like, you know, we can all, part of the reason you've seen us do flash, nano flash and pro models, but not an ultra model. It's like for each generation, we feel like we've been able to get the pro model at like, I don't know, 80, 90% of ultras capability, but ultra would be a lot more, uh, like slow and a lot more expensive to serve. But what we've been able to do is to go to the next generation and make the next generation's pro as good as the previous generation's ultra, but be able to serve it in a way that it's fast and you can use it and so on. So I do think scaling laws are working, but it's tough to get at any given time. The models we all use the most is maybe like a few months behind the maximum capability we can deliver, right? Because that won't be the fastest, easiest to use, et cetera. Also that's in terms of intelligence, it becomes harder and harder to measure, uh, performance in quotes because, you know, you could argue Gemini flash is much more impactful than pro just because of the latency is super intelligent already. I mean, sometimes like latency is, uh, maybe more important than intelligence, especially when the intelligence is just a little bit less and flash not, it's still incredibly smart model. And so you have to now start measuring impact and then it feels like benchmarks are less and less capable of capturing the intelligence of models, the effectiveness of models, the usefulness, the real world usefulness of models.`
    const FINAL_LOGICAL_CHUNKS = [
        {
            segmentEnd: 86,
            segmentStart: 0,
            summary: "Interviewer asks whether AI scaling laws continue to hold and if progress will hit a wall.",
            text: "Do you think the scaling laws are holding strong on, um, there's a lot of ways to describe the scaling laws for AI, but on the pre-training on the post-training fronts. So the flip side of that, do you anticipate AI progress will hit a wall? Is there a wall? You know, it's a cherished micro kitchen conversation. Once in a while I have it, uh, you know, like when Demis is visiting or, you know, if Demis, Cori, Jeff, Noam, Sergey, a bunch of our people, like we sit and, uh, you know, you know, talk about this. Right.",
            title: "Question about scaling laws and potential limits",
        },

        {
            segmentEnd: 214,
            segmentStart: 87,
            summary: "Speaker notes clear progress across pre-training, post-training, test-time, compute, and tool use, and improved world models in newer generations.",
            text: "I think, uh, we've been able to optimize and improve on all fronts, right. Uh, pre-training, post-training, test time, compute, tool use, right over time, making these more agentic. So getting these models to be more general world models in that direction, like VO3, uh, you know, the physics understanding is dramatically better than what VO1 or something like that was. So you kind of see on all those dimensions, I, I feel, you know, progress is very obvious to see, and I feel like there is significant headroom.",
            title: "Observed progress across multiple dimensions",
        },          

        {
            segmentEnd: 354,
            segmentStart: 215,
            summary: "Speaker cites working with top researchers as reason for optimism and expects significant progress in the coming year, while acknowledging uncertainty about exact resource use.",
            text: "More importantly, you know, I'm fortunate to work with some of the best researchers on the planet. Right. They think, uh, there is more headroom to be had here. Uh, and so I think we have an exciting trajectory ahead. It's tougher to say, you know, each year I sit and say, okay, we are going to throw 10X more compute over the course of next year at it, and like, will we see progress? Sitting here today, I feel like the year ahead will have a lot of progress.",
            title: "Confidence due to team expertise and outlook",
        },

        {
            segmentEnd: 529,
            segmentStart: 355,
            summary: "When asked about bottlenecks, the speaker identifies compute as the primary limitation and explains product decisions driven by serving costs and latency.",
            text: "And do you feel any limitations like, uh, that, or the bottlenecks, compute limited, uh, data limited, idea limited, do you feel any of those limitations? Or is it full steam ahead on all fronts? I think it's compute limited in this sense, right? Like, you know, we can all, part of the reason you've seen us do flash, nano flash and pro models, but not an ultra model. It's like for each generation, we feel like we've been able to get the pro model at like, I don't know, 80, 90% of ultras capability, but ultra would be, uh, a lot more, uh, like slow and a lot more expensive to serve.",
            title: "Bottlenecks and compute limitations",
        },

        { 
            segmentEnd: 950,
            segmentStart: 530,
            summary: "Describes strategy of making next-gen pro match prior ultra while being faster and cheaper, and discusses difficulties measuring intelligence and real-world impact versus benchmarks.",
            text: "But what we've been able to do is to go to the next generation and make the next generation's pro as good as the previous generation's ultra, but be able to serve it in a way that it's fast and you can use it and so on. So I do think scaling laws are working, but it's tough to get at any given time. The models we all use the most is maybe like a few months behind the maximum capability we can deliver, right? Because that won't be the fastest, easiest to use, et cetera. Also that's in terms of intelligence, it becomes harder and harder to measure, uh, performance in quotes because, you know, you could argue Gemini flash is much more impactful than pro just because of the latency is super intelligent already. I mean, sometimes like latency is, uh, maybe more important than intelligence, especially when the intelligence is just a little bit less and flash not, it's still incredibly smart model. And so you have to now start measuring impact and then it feels like benchmarks are less and less capable of capturing the intelligence of models, the effectiveness of models, the usefulness, the real world usefulness of models.",
            title: "Strategy of improving generation serving and measurement challenges",
        }
    ];

    const FINAL_ENRICHED_LOGICAL_CHUNKS = [
        {
            segmentEnd: 86,
            segmentStart: 0,
            chunkIndex: 0,
            summary: "Interviewer asks whether AI scaling laws continue to hold and if progress will hit a wall.",
            text: "Do you think the scaling laws are holding strong on, um, there's a lot of ways to describe the scaling laws for AI, but on the pre-training on the post-training fronts. So the flip side of that, do you anticipate AI progress will hit a wall? Is there a wall? You know, it's a cherished micro kitchen conversation. Once in a while I have it, uh, you know, like when Demis is visiting or, you know, if Demis, Cori, Jeff, Noam, Sergey, a bunch of our people, like we sit and, uh, you know, you know, talk about this. Right.",
            title: "Question about scaling laws and potential limits",
            prompt: `A conceptual illustration of a late-night kitchen table conversation among a small group of four anonymous silhouettes (no identifiable faces), leaning in around a laptop and a whiteboard covered in equations and graphs labeled "Scaling Laws?" and "Wall?"; warm domestic lighting, coffee cups, thought bubbles containing tiny neural network diagrams and a brick wall fading into circuit patterns, moody contemplative atmosphere, cinematic depth of field.`
        },

        {
            segmentEnd: 214,
            segmentStart: 87,
            chunkIndex: 1,
            summary: "Speaker notes clear progress across pre-training, post-training, test-time, compute, and tool use, and improved world models in newer generations.",
            text: "I think, uh, we've been able to optimize and improve on all fronts, right. Uh, pre-training, post-training, test time, compute, tool use, right over time, making these more agentic. So getting these models to be more general world models in that direction, like VO3, uh, you know, the physics understanding is dramatically better than what VO1 or something like that was. So you kind of see on all those dimensions, I, I feel, you know, progress is very obvious to see, and I feel like there is significant headroom.",
            title: "Observed progress across multiple dimensions",
            prompt: `A layered infographic showing multiple horizontal tracks labeled: "Pre-training", "Post-training", "Test-time", "Compute", "Tool Use"; each track contains a rising performance curve and small pictograms (data stacks, tuning knobs, stopwatch, GPU, robotic arm); a highlighted vertical \"Generations\" axis with markers VO1 -> VO3 and an inset cutaway of a neural network turning into a simplified 3D world model (physics symbols like falling ball, trajectory lines) to convey improved world understanding.`,
        },          

        {
            segmentEnd: 354,
            segmentStart: 215,
            chunkIndex: 2,
            summary: "Speaker cites working with top researchers as reason for optimism and expects significant progress in the coming year, while acknowledging uncertainty about exact resource use.",
            text: "More importantly, you know, I'm fortunate to work with some of the best researchers on the planet. Right. They think, uh, there is more headroom to be had here. Uh, and so I think we have an exciting trajectory ahead. It's tougher to say, you know, each year I sit and say, okay, we are going to throw 10X more compute over the course of next year at it, and like, will we see progress? Sitting here today, I feel like the year ahead will have a lot of progress.",
            title: "Confidence due to team expertise and outlook",
            prompt: `A team-focused scene: a modern research lab table with three generic researchers (no recognizable faces) gathered around a transparent holographic timeline labeled "Next Year" showing projected compute usage and progress bars; floating annotations like "Top researchers" "Headroom" and a translucent calendar and resource meter; optimistic color palette, dynamic lighting, subtle motion blur implying forward momentum.`,
        },

        {
            segmentEnd: 529,
            segmentStart: 355,
            chunkIndex: 3,
            summary: "When asked about bottlenecks, the speaker identifies compute as the primary limitation and explains product decisions driven by serving costs and latency.",
            text: "And do you feel any limitations like, uh, that, or the bottlenecks, compute limited, uh, data limited, idea limited, do you feel any of those limitations? Or is it full steam ahead on all fronts? I think it's compute limited in this sense, right? Like, you know, we can all, part of the reason you've seen us do flash, nano flash and pro models, but not an ultra model. It's like for each generation, we feel like we've been able to get the pro model at like, I don't know, 80, 90% of ultras capability, but ultra would be, uh, a lot more, uh, like slow and a lot more expensive to serve.",
            title: "Bottlenecks and compute limitations",
            prompt: `A technical diagram titled "Compute Bottleneck and Product Tradeoffs": left side shows a stack of GPUs and a gauge labeled "Compute" near max; center shows branching product options: "Pro" (fast, cheaper, 80–90% capability) vs "Ultra" (slower, expensive, higher capability) with arrows to serving cost and latency icons; right side shows a flowchart of decision factors (serveability, latency, cost) with callouts and simple numeric percentages, clean vector style, muted professional colors.`,
        },

        { 
            segmentEnd: 950,
            segmentStart: 530,
            chunkIndex: 4,
            summary: "Describes strategy of making next-gen pro match prior ultra while being faster and cheaper, and discusses difficulties measuring intelligence and real-world impact versus benchmarks.",
            text: "But what we've been able to do is to go to the next generation and make the next generation's pro as good as the previous generation's ultra, but be able to serve it in a way that it's fast and you can use it and so on. So I do think scaling laws are working, but it's tough to get at any given time. The models we all use the most is maybe like a few months behind the maximum capability we can deliver, right? Because that won't be the fastest, easiest to use, et cetera. Also that's in terms of intelligence, it becomes harder and harder to measure, uh, performance in quotes because, you know, you could argue Gemini flash is much more impactful than pro just because of the latency is super intelligent already. I mean, sometimes like latency is, uh, maybe more important than intelligence, especially when the intelligence is just a little bit less and flash not, it's still incredibly smart model. And so you have to now start measuring impact and then it feels like benchmarks are less and less capable of capturing the intelligence of models, the effectiveness of models, the usefulness, the real world usefulness of models.",
            title: "Strategy of improving generation serving and measurement challenges",
            prompt: `A split-panel visualization: left panel shows two stylized model icons "Previous Ultra" and "Next Gen Pro" with arrows indicating parity in capability but differences in speed (stopwatch icon) and cost (coin stacks); right panel is a conceptual measurement dashboard with degraded benchmark bars, a separate real-world impact meter, and a slider labeled "Latency vs Intelligence" demonstrating how lower latency increases real-world usefulness; annotated, infographic style with emphasis on measurement challenges and practical impact.`
        }
    ]

    let uploadedFile: File | null = $state(null);
    let files: FileList | null = $state(null); // Add this for binding to the input

    let transcribingAudio = $state(false);
    let transcriptText = $state('');
    async function transcribeAudio(file: File): Promise<string | void> {
        if (transcribingAudio) return;
        transcribingAudio = true;

        try {    
            const response = await generateTranscript(file);
    
            if (!response.success) {
                throw new Error('Transcription failed');
            }

            const data = response.data;
            transcriptText = data.text;
            const transcriptWords = data.words;
            const transcriptionSegments = data.segments;

            // console.log("transcriptText: ", transcriptText)
            // console.log("transcriptWords: ", transcriptWords)
            // console.log("transcriptionSegments: ", transcriptionSegments)
    
            transcribingAudio = false;
        } catch (error) {
            transcribingAudio = false;
            console.error('Error during transcription:', error);
        }
    }

    let generatingLogicalChunks = $state(false);
    let generatedTextChunks = $state<LogicalChunk[]>([]);
    async function handleGenerateLogicalChunks(transcriptText: string): Promise<void> {
        if (generatingLogicalChunks || !transcriptText) return;

        generatingLogicalChunks = true;
        try {
            const response = await generateLogicalChunks(transcriptText);
    
            if (!response.success) {
                throw new Error('Transcription failed');
            }
        
            const data = response.data;

            console.log('data.chunks', data.chunks);

            generatedTextChunks = data.chunks;

            generatingLogicalChunks = false;
        } catch (error) {
            generatingLogicalChunks = false;
            console.error('Error generating logical chunks:', error);
        }
    }

    let creatingMediaPrompts = $state(false);
    let enrichedChunks = $state<EnrichedChunkWithImage[]>([]);
    async function handleCreateMediaPrompt(generatedTextChunks: LogicalChunk[]): Promise<void> {
        if (creatingMediaPrompts || !generatedTextChunks) return;

        creatingMediaPrompts = true;
        try {
            let response = await createMediaPrompts(generatedTextChunks);

            if (!response.success) {
                throw new Error('Transcription failed');
            }
        
            const data = response.data;

            console.log('data.enrichedChunks', data.enrichedChunks);

            enrichedChunks = data.enrichedChunks;

            creatingMediaPrompts = false;
        } catch (error) {
            creatingMediaPrompts = false;
            console.error('Error creating media prompts:', error);
        }
    }

    let generatingImage = $state(false);
    async function handleGenerateImage(prompt: string): Promise<{url: string} | null> {
        if (generatingImage || !prompt) return null;

        generatingImage = true;
        try {
            // Call your image generation API here with the prompt
            const response = await generateImage(prompt);
    
            if (!response.success) {
                throw new Error('Image generation failed');
            }

            const data = response.data;
            const url = data.url;


            generatingImage = false;
            return {url};
        } catch (error) {
            generatingImage = false;
            console.error('Error generating image:', error);
            return null;
        }
    }

    let handlingEntireFlow = $state(false);
    async function handleEntireFlow(uploadedFile: File | null = null): Promise<void> {
        if (handlingEntireFlow || !uploadedFile) return;

        handlingEntireFlow = true;

        if (files && files.length > 0) {
            uploadedFile = files[0];

            // TEMPORARY
            // transcriptText = FINAL_TRANSCRIPT;
            // generatedTextChunks = FINAL_LOGICAL_CHUNKS;
            // enrichedChunks = FINAL_ENRICHED_LOGICAL_CHUNKS;

            await transcribeAudio(uploadedFile);
            await handleGenerateLogicalChunks(transcriptText);
            await handleCreateMediaPrompt(generatedTextChunks);

            if (enrichedChunks && enrichedChunks.length > 0) {
                for (const chunk of enrichedChunks) {
                    if (!chunk.prompt) continue;

                    // mark as generating (reactive)
                    enrichedChunks = enrichedChunks.map((c) =>
                        c.chunkIndex === chunk.chunkIndex
                            ? { ...c, imageStatus: 'generating', imageError: null }
                            : c
                    );

                    const imageData = await handleGenerateImage(chunk.prompt);

                    if (imageData?.url) {
                        enrichedChunks = enrichedChunks.map((c) =>
                            c.chunkIndex === chunk.chunkIndex
                            ? { ...c, imageUrl: imageData.url, imageStatus: 'done' }
                            : c
                        );
                    } else {
                        enrichedChunks = enrichedChunks.map((c) =>
                            c.chunkIndex === chunk.chunkIndex
                            ? { ...c, imageStatus: 'error', imageError: 'No image returned' }
                            : c
                        );
                    }
                }
            }

            handlingEntireFlow = false;
        } else {
            console.error('No file selected');
            handlingEntireFlow = false;
        }
    }


</script>

<div class=''>
    <h1 class='font-bold text-2xl'>Podcast Visualizer</h1>
</div>

<div>
    <input
        type="file"
        bind:files
        accept=".mp3,.m4a,.wav,.ogg, .mp4"
        class='border rounded p-2 mt-4'
    />
</div>

<!-- Button -->
<div class='flex flex-col'>
    {#if transcribingAudio}
        <div>
            <Loading />
            <div>
                <span>Transcribing...</span>
            </div>
        </div>
    {:else}
        <div class='flex flex-col mt-2'>
            <div class={[
                'w-min px-2 py-1 border-2 border-blue-700 rounded-lg bg-blue-300',
                (!files || files.length <= 0) && 'opacity-50',
                files && files.length <= 0 && 'opacity-50'
            ]}>
                <span
                    onclick={async () => { 
                        if (files && files.length > 0) {
                            uploadedFile = files[0];
                            await handleEntireFlow(uploadedFile);
                        } else {
                            console.error('No file selected');
                        }
                    }}
                    class='cursor-pointer text-nowrap'
                >Run Entire Flow</span>
            </div>
        </div>

        {#if transcriptText}
            <div>
                <span>{transcriptText}</span>
            </div>
        {/if}
    {/if}

    {#if generatingLogicalChunks}
        <div>
            <Loading />
            <div>
                <span>Generating chunks...</span>
            </div>
        </div>
    {:else if generatedTextChunks && generatedTextChunks.length > 0}
        <div>
            <h2 class='font-bold text-xl mt-4'>Generated Chunks:</h2>
            {#each generatedTextChunks as chunk, index}
                <div class="border p-2 my-2 rounded">
                    <h3 class="font-semibold">Chunk {index + 1}:</h3>
                    {#if chunk.title}<div class="font-semibold">{chunk.title}</div>{/if}
                    <p class="whitespace-pre-wrap">{chunk.text}</p>
                </div>
            {/each}
        </div>
    {/if}

    {#if creatingMediaPrompts}
        <div class="mt-6">
            <Loading />
            <div>
                <span>Creating media prompts...</span>
            </div>
        </div>
    {:else if enrichedChunks && enrichedChunks.length > 0}
        <div class="mt-6">
            <h2 class="font-bold text-xl mt-4">Enriched Chunks (with Prompts):</h2>

            {#each enrichedChunks as chunk, index}
                <div class="border p-3 my-3 rounded">
                    <div class="flex items-center justify-between">
                        <h3 class="font-semibold">Chunk {index + 1}</h3>
                        {#if chunk.segmentStart != null && chunk.segmentEnd != null}
                            <span class="text-sm opacity-70">
                                Segments: {chunk.segmentStart}–{chunk.segmentEnd}
                            </span>
                        {/if}
                    </div>

                    {#if chunk.title}
                        <div class="mt-2">
                            <div class="text-sm font-semibold opacity-80">Title</div>
                            <div>{chunk.title}</div>
                        </div>
                    {/if}

                    {#if chunk.summary}
                        <div class="mt-2">
                            <div class="text-sm font-semibold opacity-80">Summary</div>
                            <div>{chunk.summary}</div>
                        </div>
                    {/if}

                    {#if chunk.text}
                        <div class="mt-2">
                            <div class="text-sm font-semibold opacity-80">Chunk Text</div>
                            <p class="whitespace-pre-wrap">{chunk.text}</p>
                        </div>
                    {/if}

                    <div class="mt-3 border-t pt-3">
                        <div class="text-sm font-semibold opacity-80">Image Prompt</div>
                        <p class="whitespace-pre-wrap">{chunk.prompt}</p>
                    </div>

                    <div class="mt-2 text-xs opacity-70">
                        Route: {chunk.promptType}
                      </div>

                    <div class="mt-3 border-t pt-3">
                        <div class="text-sm font-semibold opacity-80">Generated Image</div>
                    
                        {#if chunk.imageStatus === 'generating'}
                            <div class="mt-2 flex items-center gap-2">
                                <Loading />
                                <span class="text-sm opacity-80">Generating image...</span>
                            </div>
                        {:else if chunk.imageStatus === 'error'}
                            <div class="mt-2 text-sm text-red-700">
                                Failed: {chunk.imageError ?? 'Unknown error'}
                            </div>
                        {:else if chunk.imageUrl}
                            <img
                                class="mt-2 w-full max-w-lg rounded border"
                                src={chunk.imageUrl}
                                alt={"Generated image for chunk " + (index + 1)}
                                loading="lazy"
                            />
                        {:else}
                            <div class="mt-2 text-sm opacity-70">No image generated yet.</div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

</div>