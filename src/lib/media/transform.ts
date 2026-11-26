import sharp from "sharp";
import { imageExtension } from "../categories/validation.ts";
import { FormError } from "../form-error.ts";

const widths = [160, 480, 960, 1440] as const;

export function mediaWidth(request: Request) {
  const raw = new URL(request.url).searchParams.get("w");
  if (raw === null) return null;
  const width = Number(raw);
  if (!widths.includes(width as (typeof widths)[number]) || String(width) !== raw)
    throw new FormError("Невірний розмір фото.");
  return width;
}

// Decode pixels rather than trusting the filename/header; remove EXIF on re-encode.
export async function preparePhoto(bytes: Uint8Array, type: string, width = 2400, quality = 85) {
  imageExtension(type, bytes);
  try {
    return await sharp(bytes, {
      limitInputPixels: 32_000_000,
      failOn: "warning",
      autoOrient: true,
    }).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 4 }).toBuffer();
  } catch {
    throw new FormError("Зображення пошкоджене або перевищує 32 млн пікселів.");
  }
}
