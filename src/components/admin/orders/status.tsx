import { orderStatuses, orderStatus } from "@/lib/admin/orders/policy";
const colors = {
  new: "bg-blue-50 text-blue-900",
  processing: "bg-amber-50 text-amber-900",
  shipped: "bg-indigo-50 text-indigo-900",
  completed: "bg-emerald-50 text-emerald-900",
  cancelled: "bg-zinc-100 text-zinc-700",
};
export function OrderBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${orderStatus(status) ? colors[status] : "bg-canvas"}`}
    >
      {orderStatus(status) ? orderStatuses[status] : status}
    </span>
  );
}
