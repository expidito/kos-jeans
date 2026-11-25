export const contentKeys = [
  "brand",
  "contacts",
  "social_links",
  "about",
  "delivery_template",
  "payment_template",
  "returns_template",
  "privacy_template",
  "terms_template",
] as const;
export type ContentKey = (typeof contentKeys)[number];
export const contentLabels: Record<ContentKey, string> = {
  brand: "Назва магазину",
  contacts: "Контакти",
  social_links: "Соціальні мережі",
  about: "Про магазин",
  delivery_template: "Доставка",
  payment_template: "Оплата",
  returns_template: "Обмін та повернення",
  privacy_template: "Політика конфіденційності",
  terms_template: "Умови користування",
};
export type ContentValue = Record<string, string | boolean>;
export const defaults: Record<ContentKey, ContentValue> = {
  brand: { name: "KOS JEANS" },
  contacts: { phone: "", email: "", verified: false },
  social_links: {
    instagram: "",
    facebook: "",
    tiktok: "",
    other: "",
    verified: false,
  },
  about: {
    text: "KOS JEANS — простір деніму та повсякденного одягу. Магазин у розробці. Реальні покупки й онлайн-оплата поки недоступні.",
    draft: true,
  },
  delivery_template: {
    text: "Міста, способи, вартість і строки доставки ще не погоджені. Власник має додати підтверджені умови перед запуском. Введення відділення Нової пошти у тестовій формі ручне, без API-перевірки.",
    draft: true,
  },
  payment_template: {
    text: "Способи оплати та умови розрахунків ще не визначені. Онлайн-оплата не підключена. Тестове оформлення не потребує платежу.",
    draft: true,
  },
  returns_template: {
    text: "Перед запуском власник має погодити порядок звернення, умови обміну й повернення, адресу та контакти відповідальної особи. Цей текст не визначає строки й не замінює перевірені правила продавця.",
    draft: true,
  },
  privacy_template: {
    text: "ЧЕРНЕТКА ДЛЯ ПОГОДЖЕННЯ. У формі замовлення обробляються ім’я, телефон, місто, адреса доставки та коментар. Потрібно визначити відповідальну юридичну особу, законні підстави й цілі обробки, строки зберігання, одержувачів даних, порядок звернень та права покупця. Не вводьте реальні персональні дані в тестовому магазині. Остаточну політику має погодити власник.",
    draft: true,
  },
  terms_template: {
    text: "ЧЕРНЕТКА ДЛЯ ПОГОДЖЕННЯ. Сайт перебуває у розробці. Тестові товари, замовлення та ціни не є готовою комерційною пропозицією. Перед запуском потрібні реквізити продавця, порядок укладення договору, підтвердження замовлення, оплати, доставки, обміну, повернення та розгляду звернень. Цей шаблон не є погодженими умовами продажу.",
    draft: true,
  },
};
export function safeInternalLink(value: string) {
  return (
    /^(\/(?:catalog(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|product\/[a-z0-9]+(?:-[a-z0-9]+)*|contacts|delivery|returns|privacy|terms)?|\/#about)$/.test(
      value,
    ) && value.length <= 240
  );
}
export function socialUrl(value: string) {
  if (!value) return "";
  try {
    const u = new URL(value);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      /[\s\\\u0000-\u001f]/.test(value) ||
      !u.hostname.includes(".")
    )
      throw Error();
    return u.href;
  } catch {
    throw Error("Соціальне посилання: повний HTTPS URL без пароля й пробілів.");
  }
}
export function settingInput(key: ContentKey, value: unknown): ContentValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Невірні налаштування.");
  const v = value as Record<string, unknown>,
    out: ContentValue = {};
  for (const field of Object.keys(defaults[key])) {
    if (typeof defaults[key][field] === "boolean") {
      if (typeof v[field] !== "boolean")
        throw Error("Підтвердьте статус відомостей.");
      out[field] = v[field] as boolean;
    } else {
      if (typeof v[field] !== "string") throw Error("Перевірте текст.");
      const text = (v[field] as string).trim();
      if (
        text.length >
          (field === "text" ? 12000 : field === "name" ? 100 : 500) ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
      )
        throw Error("Текст завеликий або містить службові символи.");
      out[field] = text;
    }
  }
  if (key === "brand" && !out.name) throw Error("Вкажіть назву магазину.");
  if (key === "contacts") {
    if (out.phone && !/^\+380\d{9}$/.test(String(out.phone)))
      throw Error("Телефон: +380 і 9 цифр.");
    if (
      out.email &&
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(out.email))
    )
      throw Error("Перевірте email.");
  }
  if (key === "social_links")
    for (const f of ["instagram", "facebook", "tiktok", "other"])
      out[f] = socialUrl(String(out[f]));
  return out;
}
export function bannerInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Невірний банер.");
  const v = value as Record<string, unknown>;
  const text = (k: string, max: number) => {
    if (typeof v[k] !== "string" || (v[k] as string).length > max)
      throw Error("Перевірте текст банера.");
    return (v[k] as string).trim();
  };
  const title = text("title", 200),
    subtitle = text("subtitle", 500),
    alt_text = text("alt_text", 200),
    button_label = text("button_label", 80),
    link_path = text("link_path", 240);
  if (!title || !safeInternalLink(link_path))
    throw Error("Вкажіть заголовок і безпечну сторінку магазину.");
  if (
    !Number.isInteger(v.sort_order) ||
    Number(v.sort_order) < 0 ||
    Number(v.sort_order) > 1000000 ||
    typeof v.is_visible !== "boolean"
  )
    throw Error("Перевірте порядок і видимість.");
  const date = (k: string) =>
    v[k] === null || v[k] === ""
      ? null
      : typeof v[k] === "string" &&
          (v[k] as string).length <= 40 &&
          !Number.isNaN(Date.parse(v[k] as string))
        ? new Date(v[k] as string).toISOString()
        : (() => {
            throw Error("Перевірте дату.");
          })();
  const starts_at = date("starts_at"),
    ends_at = date("ends_at");
  if (starts_at && ends_at && starts_at > ends_at)
    throw Error("Кінець показу має бути після початку.");
  const image_path = typeof v.image_path === "string" ? v.image_path : null;
  if (v.is_visible && (!image_path || !alt_text || !button_label))
    throw Error("Для публікації потрібні фото, опис фото та текст кнопки.");
  return {
    title,
    subtitle,
    alt_text,
    button_label,
    link_path,
    sort_order: Number(v.sort_order),
    is_visible: v.is_visible,
    starts_at,
    ends_at,
    image_path,
  };
}
