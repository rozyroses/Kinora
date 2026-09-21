import { getSupabaseClient } from "@/lib/supabase";

export async function uploadGenerationImage(file: File) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Kinora is not connected to Supabase.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You must be signed in to upload an image.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${user.id}/generation-inputs/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("project-assets")
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || "image/png",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("project-assets")
    .createSignedUrl(filePath, 60 * 60);

  if (signedUrlError) {
    throw new Error(signedUrlError.message);
  }

  if (!signedUrlData?.signedUrl) {
    throw new Error("Could not create a signed URL for the uploaded image.");
  }

  return {
    path: filePath,
    signedUrl: signedUrlData.signedUrl,
  };
}
