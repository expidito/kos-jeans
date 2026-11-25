import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import { orderFilters, type OrderStatus } from "./policy";
export type OrderListRow = {
  id: string;
  order_number: string;
  customer_name: string;
  total_kopecks: number;
  delivery_method: string;
  status: OrderStatus;
  created_at: string;
  quantity: number;
};
export async function adminOrders(
  params: Record<string, string | string[] | undefined>,
) {
  const { client } = await requireAdmin();
  const filters = orderFilters(params);
  const { data, error } = await client.rpc("admin_order_search", {
    p_number: filters.number,
    p_status: filters.status,
    p_from: filters.from || undefined,
    p_to: filters.to || undefined,
    p_sort: filters.sort,
    p_page: filters.page,
  });
  if (error)
    throw Error("Не вдалося завантажити замовлення. Спробуйте ще раз.");
  return {
    ...(data as unknown as { items: OrderListRow[]; total: number }),
    filters,
  };
}
export async function adminOrder(id: string) {
  const { client } = await requireAdmin();
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      id,
    )
  )
    return null;
  // Explicit allowlist: guest capability hashes/idempotency keys are never sent to UI.
  const { data, error } = await client
    .from("orders")
    .select(
      "id,order_number,status,customer_name,customer_phone,city,delivery_method,delivery_address,comment,total_kopecks,created_at,updated_at,inventory_released_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw Error("Не вдалося завантажити замовлення.");
  if (!data) return null;
  const lines = await client
    .from("order_items")
    .select(
      "id,product_name,sku,size,color,quantity,unit_price_kopecks,line_total_kopecks,variant_id",
    )
    .eq("order_id", id)
    .order("id");
  if (lines.error) throw Error("Не вдалося завантажити склад замовлення.");
  return { order: data, items: lines.data ?? [] };
}
