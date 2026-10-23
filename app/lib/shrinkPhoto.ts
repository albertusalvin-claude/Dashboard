// Browser-only: shrinks a photo before it's uploaded. Phone photos run to
// several MB, more than a Server Action accepts (1 MB) — and more than a
// review card needs.

const MAX_SIDE = 1600;
const TARGET_BYTES = 900_000;

/** The size to draw at: the longest side at most `maxSide`, never enlarged. */
export function fitWithin(width: number, height: number, maxSide = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * A JPEG of the photo at most 1600px on its longest side, stepping the
 * quality down until it's under ~900 KB. Throws if the browser can't read
 * the image (some HEIC photos, for instance).
 */
export async function shrinkPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && (blob.size <= TARGET_BYTES || quality === 0.45)) return new File([blob], name, { type: "image/jpeg" });
  }
  throw new Error("Couldn't shrink that photo.");
}
