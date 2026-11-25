export const validKey = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    v,
  );
export type Customer = {
  name: string;
  phone: string;
  city: string;
  method: "nova_poshta_branch" | "nova_poshta_address";
  address: string;
  comment: string;
};
export type CheckoutItem = {
  variantId: string;
  quantity: number;
  price: number;
};
export type Receipt = {
  number: string;
  total: number;
  items: { variantId: string; quantity: number }[];
};
function text(v: unknown, min: number, max: number, label: string) {
  if (
    typeof v !== "string" ||
    v.trim().length < min ||
    v.trim().length > max ||
    /[\u0000-\u001F\u007F]/.test(v)
  )
    throw Error(`Перевірте поле «${label}».`);
  return v.trim();
}
export function checkoutInput(raw: unknown) {
  if (!raw || typeof raw !== "object") throw Error("Невірні дані.");
  const v = raw as Record<string, unknown>;
  if (!validKey(v.key)) throw Error("Оновіть сторінку оформлення.");
  if (!v.customer || typeof v.customer !== "object")
    throw Error("Заповніть контактні дані.");
  const c = v.customer as Record<string, unknown>;
  const name = text(c.name, 2, 100, "Ім’я та прізвище");
  if (!/^[\p{L}\p{M}'’ʼ -]+$/u.test(name))
    throw Error("Ім’я: використовуйте літери, пробіли, апостроф або дефіс.");
  let phone = text(c.phone, 7, 30, "Телефон").replace(/[\s()-]/g, "");
  if (/^0\d{9}$/.test(phone)) phone = "+38" + phone;
  else if (/^380\d{9}$/.test(phone)) phone = "+" + phone;
  if (!/^\+380\d{9}$/.test(phone))
    throw Error("Телефон: введіть український номер у форматі +380…");
  if (!["nova_poshta_branch", "nova_poshta_address"].includes(String(c.method)))
    throw Error("Оберіть спосіб доставки.");
  const customer: Customer = {
    name,
    phone,
    city: text(c.city, 2, 100, "Місто"),
    method: c.method as Customer["method"],
    address: text(c.address, 3, 300, "Відділення або адреса"),
    comment: typeof c.comment === "string" ? c.comment.trim() : "",
  };
  if (
    customer.comment.length > 1000 ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(customer.comment)
  )
    throw Error("Коментар: до 1000 символів.");
  if (!Array.isArray(v.items) || v.items.length < 1 || v.items.length > 50)
    throw Error("Перевірте кошик.");
  const seen = new Set<string>();
  const items: CheckoutItem[] = v.items
    .map((x) => {
      if (
        !x ||
        typeof x !== "object" ||
        typeof x.variantId !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          x.variantId,
        ) ||
        seen.has(x.variantId) ||
        !Number.isInteger(x.quantity) ||
        x.quantity < 1 ||
        x.quantity > 99 ||
        !Number.isInteger(x.price) ||
        x.price < 0 ||
        x.price > 2147483647
      )
        throw Error("Перевірте товари та кількість.");
      seen.add(x.variantId);
      return { variantId: x.variantId, quantity: x.quantity, price: x.price };
    })
    .sort((a, b) => a.variantId.localeCompare(b.variantId));
  return { key: v.key, customer, items };
}
