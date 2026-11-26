import "server-only";
import { preparePhoto } from "./transform";

// Call only after the caller has authorized metadata AND Storage download via RLS.
export async function privatePhotoResponse(data: Blob, headers: Record<string, string>, width: number | null) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(data.type))
    return new Response(null, { status: 404, headers });
  if (width === null)
    return new Response(await data.arrayBuffer(), { headers: { ...headers, "Content-Type": data.type } });
  try {
    const bytes = await preparePhoto(new Uint8Array(await data.arrayBuffer()), data.type, width, 80);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
