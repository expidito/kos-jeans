import { adminSession } from "@/lib/admin/auth";
import { uuidPattern } from "@/lib/categories/validation";
import { bannerMedia, bannerHeaders } from "@/lib/content/media";
export const dynamic = "force-dynamic";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await adminSession(),
    id = (await params).id;
  if (session.status !== "admin" || !uuidPattern.test(id))
    return new Response(null, { status: 404, headers: bannerHeaders });
  return bannerMedia(session.client, id);
}
