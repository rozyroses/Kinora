import { getSupabaseClient, supabaseConfig } from "@/lib/supabase";

export type SeedanceMode = "text-to-video" | "image-to-video";

export type SeedanceRequest = {
  prompt: string;
  duration?: number;
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  resolution?: "720p";
  generate_audio?: boolean;
  image?: string;
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

  return "Seedance request failed.";
}

async function requireSession() {
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

  return { supabase, session };
}

export function isSeedanceTerminal(status?: string) {
  return ["succeeded", "failed", "canceled", "aborted"].includes(
    status ?? "",
  );
}

export async function generateSeedanceVideo(
  input: SeedanceRequest,
): Promise<SeedancePrediction> {
  const { supabase } = await requireSession();

  const { data, error } = await supabase.functions.invoke("generate-seedance", {
    body: {
      action: "create",
      prompt: input.prompt.trim(),
      duration: input.duration ?? 5,
      aspect_ratio: input.aspect_ratio ?? "16:9",
      resolution: input.resolution ?? "720p",
      generate_audio: input.generate_audio ?? true,
      image: input.image,
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

export async function getSeedancePrediction(
  predictionId: string,
): Promise<SeedancePrediction> {
  const { supabase } = await requireSession();

  const { data, error } = await supabase.functions.invoke("generate-seedance", {
    body: {
      action: "status",
      prediction_id: predictionId,
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

export async function fetchSeedanceVideoBlob(predictionId: string) {
  const { session } = await requireSession();

  if (!supabaseConfig.configured) {
    throw new Error("Kinora is not connected to Supabase.");
  }

  const response = await fetch(
    `${supabaseConfig.url}/functions/v1/generate-seedance`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseConfig.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "result",
        prediction_id: predictionId,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();

    try {
      const parsed = JSON.parse(text) as { error?: unknown };
      throw new Error(getErrorMessage(parsed.error));
    } catch (error) {
      if (error instanceof Error && error.message !== text) throw error;
      throw new Error(text || "Could not load the finished video.");
    }
  }

  return response.blob();
}
