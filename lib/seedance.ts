import { getSupabaseClient } from "@/lib/supabase";

export type SeedanceRequest = {
  prompt: string;
  duration?: number;
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  resolution?: "720p";
  generate_audio?: boolean;
};

export type SeedancePrediction = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: unknown;
  urls?: {
    get?: string;
    cancel?: string;
    stream?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function getErrorMessage(value: unknown) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Seedance could not start the generation.";
}

export async function generateSeedanceVideo(
  input: SeedanceRequest,
): Promise<SeedancePrediction> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error(
      "Kinora is not connected to Supabase. Check the NEXT_PUBLIC_SUPABASE_URL and publishable key environment variables.",
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Sign in to Kinora before starting a generation.");
  }

  const { data, error } = await supabase.functions.invoke("generate-seedance", {
    body: {
      prompt: input.prompt.trim(),
      duration: input.duration ?? 5,
      aspect_ratio: input.aspect_ratio ?? "16:9",
      resolution: input.resolution ?? "720p",
      generate_audio: input.generate_audio ?? true,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(getErrorMessage(data.error));
  }

  return data as SeedancePrediction;
}
