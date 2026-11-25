export const orderStatuses = {
  new: "Нове",
  processing: "В обробці",
  shipped: "Відправлено",
  completed: "Завершено",
  cancelled: "Скасовано",
} as const;
export type OrderStatus = keyof typeof orderStatuses;
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  new: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};
export function orderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && Object.hasOwn(orderStatuses, value);
}
export function orderFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const str = (k: string) =>
    typeof params[k] === "string" ? (params[k] as string) : "";
  const number = str("number").replace(/^#/, "");
  const date = (k: string) => {
    const v = str(k);
    return /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v
      ? v
      : "";
  };
  const from = date("from"),
    to = date("to");
  return {
    number: /^\d{1,18}$/.test(number) ? number : "",
    status: orderStatus(str("status")) ? str("status") : "",
    from,
    to: from && to && from > to ? "" : to,
    sort: ["oldest", "total_asc", "total_desc"].includes(str("sort"))
      ? str("sort")
      : "newest",
    page: /^[1-9]\d{0,4}$/.test(str("page")) ? Number(str("page")) : 1,
  };
}
export function deliveryLabel(method: string) {
  return method === "nova_poshta_branch"
    ? "Нова пошта · відділення"
    : method === "nova_poshta_address"
      ? "Нова пошта · адреса"
      : method;
}
export function orderDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
