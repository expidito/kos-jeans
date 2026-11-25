import { adminSession } from "@/lib/admin/auth";
import { uuidPattern } from "@/lib/categories/validation";
import { categoryMediaHeaders as headers } from "@/lib/categories/media";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await adminSession();
  const { id } = await params;
  if (session.status !== "admin" || !uuidPattern.test(id))
    return new Response(null, { status: 404, headers });
  try {
    const result = await session.client
      .from("product_images")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    if (result.error || !result.data)
      return new Response(null, { status: 404, headers });
    const file = await session.client.storage
      .from("store-media")
      .download(result.data.storage_path);
    if (file.error || !file.data)
      return new Response(null, { status: 404, headers });
    return new Response(await file.data.arrayBuffer(), {
      headers: { ...headers, "Content-Type": file.data.type },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
