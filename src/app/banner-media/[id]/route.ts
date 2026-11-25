import { publicCatalogClient } from "@/lib/catalog/data";
import { uuidPattern } from "@/lib/categories/validation";
import { bannerMedia, bannerHeaders } from "@/lib/content/media";
export const dynamic = "force-dynamic";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id,
    client = publicCatalogClient();
  if (!client || !uuidPattern.test(id))
    return new Response(null, { status: 404, headers: bannerHeaders });
  return bannerMedia(client, id);
}
