"use client";

import { FormEvent, useState } from "react";
import { StudioHeader } from "@/components/StudioHeader";
import {
  generateSeedanceVideo,
  type SeedancePrediction,
} from "@/lib/seedance";

const durations = [5, 10, 15, 30] as const;
const aspectRatios = ["16:9", "9:16", "1:1"] as const;

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<(typeof durations)[number]>(5);
  const [aspectRatio, setAspectRatio] =
    useState<(typeof aspectRatios)[number]>("16:9");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [prediction, setPrediction] = useState<SeedancePrediction | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanPrompt = prompt.trim();

    if (!cleanPrompt) {
      setError("Give Kinora a prompt first.");
      return;
    }

    setError("");
    setPrediction(null);
    setIsGenerating(true);

    try {
      const result = await generateSeedanceVideo({
        prompt: cleanPrompt,
        duration,
        aspect_ratio: aspectRatio,
        resolution: "720p",
        generate_audio: generateAudio,
      });

      setPrediction(result);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Something went wrong while starting the generation.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <StudioHeader
        eyebrow="CREATE"
        title="Bring the scene in your head to life."
        description="Kinora can now send text-to-video jobs to Seedance 2.5 through your private Supabase function."
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <form
          onSubmit={handleGenerate}
          className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                Model
              </div>
              <div className="mt-1 text-sm font-medium text-white">
                Seedance 2.5
              </div>
            </div>
            <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-100/75">
              Text to video
            </span>
          </div>

          <label
            htmlFor="kinora-prompt"
            className="text-xs uppercase tracking-[0.2em] text-white/40"
          >
            Prompt
          </label>
          <textarea
            id="kinora-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the shot, characters, movement, camera, lighting, and mood..."
            className="mt-3 min-h-48 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-violet-300/40"
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Control label="Mode">
              <div className="text-sm text-white/70">Text to video</div>
            </Control>

            <Control label="Resolution">
              <div className="text-sm text-white/70">720p</div>
            </Control>

            <Control label="Aspect ratio">
              <select
                value={aspectRatio}
                onChange={(event) =>
                  setAspectRatio(
                    event.target.value as (typeof aspectRatios)[number],
                  )
                }
                className="w-full bg-transparent text-sm text-white/75 outline-none"
              >
                {aspectRatios.map((ratio) => (
                  <option key={ratio} value={ratio} className="bg-[#0f1115]">
                    {ratio}
                  </option>
                ))}
              </select>
            </Control>

            <Control label="Duration">
              <select
                value={duration}
                onChange={(event) =>
                  setDuration(
                    Number(event.target.value) as (typeof durations)[number],
                  )
                }
                className="w-full bg-transparent text-sm text-white/75 outline-none"
              >
                {durations.map((seconds) => (
                  <option
                    key={seconds}
                    value={seconds}
                    className="bg-[#0f1115]"
                  >
                    {seconds} seconds
                  </option>
                ))}
              </select>
            </Control>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-white/30">
                Native audio
              </span>
              <span className="mt-1 block text-sm text-white/65">
                Ask Seedance to generate audio with the clip
              </span>
            </span>
            <input
              type="checkbox"
              checked={generateAudio}
              onChange={(event) => setGenerateAudio(event.target.checked)}
              className="h-4 w-4 accent-violet-300"
            />
          </label>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-100/80">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="mt-6 w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isGenerating ? "Sending to Seedance…" : "Generate video ✦"}
          </button>
        </form>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">
              Generation status
            </div>

            {prediction ? (
              <div className="mt-4 space-y-3">
                <StatusRow
                  label="Status"
                  value={prediction.status ?? "submitted"}
                />
                <StatusRow label="Model" value="Seedance 2.5" />
                {prediction.id ? (
                  <StatusRow label="Prediction ID" value={prediction.id} mono />
                ) : null}
                <p className="pt-2 text-xs leading-5 text-white/35">
                  Kinora successfully handed this job to Seedance. The next
                  update will let this panel follow the job until the finished
                  video is ready.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-white/45">
                Your Seedance job status will appear here after you hit
                Generate.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.06] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-violet-200/60">
              Kinora video · phase 1
            </div>
            <p className="mt-3 text-sm leading-6 text-white/50">
              This pass proves the secure Kinora → Supabase → Seedance
              connection. Reference images, finished-video polling, and saving
              to Generation History are next.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Control({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
        {label}
      </div>
      {children}
    </div>
  );
}

function StatusRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">
        {label}
      </div>
      <div
        className={`mt-1 break-all text-sm text-white/75 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
