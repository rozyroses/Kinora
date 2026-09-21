const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("REPLICATE_API_TOKEN");

    if (!token) {
      throw new Error("REPLICATE_API_TOKEN is missing");
    }

    const body = await req.json();
    const action = body.action ?? "create";

    if (action === "status") {
      const predictionId = body.prediction_id;

      if (!predictionId || typeof predictionId !== "string") {
        return jsonResponse({ error: "prediction_id is required" }, 400);
      }

      const response = await fetchPrediction(token, predictionId);
      const text = await response.text();

      return new Response(text, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (action === "result") {
      const predictionId = body.prediction_id;

      if (!predictionId || typeof predictionId !== "string") {
        return jsonResponse({ error: "prediction_id is required" }, 400);
      }

      const predictionResponse = await fetchPrediction(token, predictionId);
      const prediction = await predictionResponse.json();

      if (!predictionResponse.ok) {
        return jsonResponse(prediction, predictionResponse.status);
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

    const data = await response.json();

    return jsonResponse(data, response.status);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
