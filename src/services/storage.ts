import { supabase } from "@/utils/supabase";
import imageCompression from "browser-image-compression";

const BUCKET = "post-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export async function uploadPostImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("파일 크기는 5MB 이하여야 합니다.");
  }

  // GIF는 압축 시 애니메이션 손실 → 원본 유지
  let processedFile: File = file;
  if (file.type !== "image/gif") {
    try {
      processedFile = await imageCompression(file, COMPRESSION_OPTIONS);
    } catch {
      // 압축 실패 시 원본 사용
      processedFile = file;
    }
  }

  const now = new Date();
  const ext = processedFile.type === "image/webp" ? "webp" : file.name.split(".").pop();
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, processedFile, {
    contentType: processedFile.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
