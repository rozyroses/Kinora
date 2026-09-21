import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function findFirstHttpUrl(value: unknown): string | null {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findFirstHttpUrl(item);
      if (match) return match;
    }
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const match = findFirstHttpUrl(item);
      if (match) return match;
    }
  }

  return null;
}

function dbStatus(status?: string) {
  if (status === "succeeded") return "succeeded";
  if (["failed", "canceled", "aborted"].includes(status ?? "")) return "failed";
  if (["starting", "processing"].includes(status ?? "")) return "running";
  return "queued";
}

async function fetchPrediction(token: string, predictionId: string) {
  return fetch(
    `https://api.replicate.com/v1/predictions/${encodeURIComponent(
      predictionId,
    )}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

async function getCallerClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !authorization) {
    throw new Error("Supabase authentication is unavailable.");
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

async function ownedGeneration(
  supabase: Awaited<ReturnType<typeof getCallerClient>>["supabase"],
  userId: string,
  predictionId: string,
) {
  const { data, error } = await supabase
    .from("generations")
    .select("id")
    .eq("user_id", userId)
    .contains("metadata", { prediction_id: predictionId })
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("REPLICATE_API_TOKEN");

    if (!token) {
      throw new Error("REPLICATE_API_TOKEN is missing");
    }

    const { supabase, user } = await getCallerClient(req);
    const body = await req.json();
    const action = body.action ?? "create";

    if (action === "status" || action === "result") {
      const predictionId = body.prediction_id;

      if (!predictionId || typeof predictionId !== "string") {
        return jsonResponse({ error: "prediction_id is required" }, 400);
      }

      const generation = await ownedGeneration(
        supabase,
        user.id,
        predictionId,
      );

      if (!generation) {
        return jsonResponse({ error: "Generation not found." }, 404);
      }

      const predictionResponse = await fetchPrediction(token, predictionId);
      const prediction = await predictionResponse.json();

      if (!predictionResponse.ok) {
        return jsonResponse(prediction, predictionResponse.status);
      }

      await supabase
        .from("generations")
        .update({
          status: dbStatus(prediction.status),
          error_message:
            typeof prediction.error === "string" ? prediction.error : null,
        })
        .eq("id", generation.id);

      if (action === "status") {
        return jsonResponse(prediction, 200);
      }

      if (prediction.status !== "succeeded") {
        return jsonResponse(
          {
            error: `Prediction is not ready yet (status: ${prediction.status ?? "unknown"})`,
          },
          409,
        );
      }

      const outputUrl = findFirstHttpUrl(prediction.output);

      if (!outputUrl) {
        return jsonResponse(
          { error: "No media URL was found in the finished prediction." },
          404,
        );
      }

      const mediaResponse = await fetch(outputUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!mediaResponse.ok || !mediaResponse.body) {
        return jsonResponse(
          { error: "Could not retrieve the finished video from Replicate." },
          mediaResponse.status || 502,
        );
      }

      const contentType =
        mediaResponse.headers.get("content-type") ?? "video/mp4";

      return new Response(mediaResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    const {
      prompt,
      duration = 5,
      aspect_ratio = "16:9",
      resolution = "720p",
      generate_audio = true,
      image,
      reference_images = [],
    } = body;

    if (!prompt && !image && reference_images.length === 0) {
      return jsonResponse(
        { error: "A prompt or media reference is required." },
        400,
      );
    }

    const input: Record<string, unknown> = {
      prompt,
      duration,
      aspect_ratio,
      resolution,
      generate_audio,
      watermark: false,
    };

    if (image) {
      input.image = image;
    }

    if (Array.isArray(reference_images) && reference_images.length > 0) {
      input.reference_images = reference_images;
    }

    const response = await fetch(
      "https://api.replicate.com/v1/models/bytedance/seedance-2.5/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      },
    );

    const prediction = await response.json();

    if (!response.ok) {
      return jsonResponse(prediction, response.status);
    }

    if (!prediction.id || typeof prediction.id !== "string") {
      return jsonResponse(
        { error: "Replicate did not return a prediction ID." },
        502,
      );
    }

    const { error: trackingError } = await supabase.from("generations").insert({
      user_id: user.id,
      kind: "video",
      prompt: prompt || "Image-to-video generation",
      provider: "replicate",
      model: "bytedance/seedance-2.5",
      status: dbStatus(prediction.status),
      metadata: {
        prediction_id: prediction.id,
        mode: image ? "image-to-video" : "text-to-video",
        duration,
        aspect_ratio,
        resolution,
        generate_audio,
      },
    });

    if (trackingError) {
      await fetch(
        `https://api.replicate.com/v1/predictions/${encodeURIComponent(
          prediction.id,
        )}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      ).catch(() => undefined);

      return jsonResponse(
        {
          error:
            "Kinora could not securely track this generation, so it was canceled.",
        },
        500,
      );
    }

    return jsonResponse(prediction, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return jsonResponse(
      {
        error: message,
      },
      message === "Unauthorized" ? 401 : 500,
    );
  }
});
