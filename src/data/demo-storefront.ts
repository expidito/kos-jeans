import type { DemoCollection, DemoProduct, NavigationNode } from "@/lib/storefront";

/** Block 04 only: visual samples, never inventory, sales statistics or Supabase seed data. */
export const demoProducts: DemoProduct[] = [
  { id: "demo-01", name: "Джинсова куртка", image: "/images/storefront/hero.jpg", alt: "Фотоілюстрація: жінка в джинсовій куртці біля бетонної стіни", color: "Блакитний денім", amountMinor: 249900, collection: "Для неї" },
  { id: "demo-02", name: "Світлий денім", image: "/images/storefront/straight.jpg", alt: "Фотоілюстрація: деталь світлих джинсів", color: "Світло-синій", amountMinor: 179900, collection: "Для неї" },
  { id: "demo-03", name: "Куртка з деніму", image: "/images/storefront/men.jpg", alt: "Фотоілюстрація: чоловік у синій джинсовій куртці", color: "Синій денім", amountMinor: 289900, collection: "Для нього" },
  { id: "demo-04", name: "Базова футболка", image: "/images/storefront/tee.jpg", alt: "Фотоілюстрація: біла футболка на вішаку", color: "Білий", amountMinor: 79900, collection: "Базовий гардероб" },
  { id: "demo-05", name: "Сорочка на щодень", image: "/images/storefront/shirt.jpg", alt: "Фотоілюстрація: чоловік у білій сорочці", color: "Білий", amountMinor: 149900, previousMinor: 189900, collection: "Для нього" },
  { id: "demo-06", name: "Денім у деталях", image: "/images/storefront/jeans.jpg", alt: "Фотоілюстрація: текстура та кишеня синіх джинсів", color: "Класичний синій", amountMinor: 159900, previousMinor: 199900, collection: "Джинси" },
];

function leaf(id: string, label: string): NavigationNode {
  return { id, label, href: "#collection", children: [] };
}

export const demoNavigation: NavigationNode[] = ["women", "men"].map((audience) => ({
  id: audience,
  label: audience === "women" ? "Жінкам" : "Чоловікам",
  href: `#${audience}`,
  children: [
    { ...leaf(`${audience}-jeans`, "Джинси"), children: [leaf(`${audience}-straight`, "Прямі силуети"), leaf(`${audience}-relaxed`, "Вільні силуети")] },
    leaf(`${audience}-trousers`, "Штани"),
    { ...leaf(`${audience}-jackets`, "Куртки"), children: [leaf(`${audience}-denim-jackets`, "Джинсові куртки"), leaf(`${audience}-light-jackets`, "Легкі куртки")] },
    leaf(`${audience}-shorts`, "Шорти"),
    leaf(`${audience}-tees`, "Футболки"),
    leaf(`${audience}-other`, "Інший одяг"),
  ],
}));

export const demoMenuImages: Record<string, string> = {
  women: "/images/storefront/women.jpg",
  men: "/images/storefront/men.jpg",
};

export const demoCollectionProducts: Record<string, string[]> = {
  women: ["demo-01", "demo-02", "demo-04"],
  men: ["demo-03", "demo-05", "demo-06"],
  "women-jeans": ["demo-02", "demo-06"], "men-jeans": ["demo-06"],
  "women-straight": ["demo-02"], "men-straight": ["demo-06"],
  "women-relaxed": ["demo-02"], "men-relaxed": ["demo-06"],
  "women-jackets": ["demo-01"], "men-jackets": ["demo-03"],
  "women-denim-jackets": ["demo-01"], "men-denim-jackets": ["demo-03"],
  "women-tees": ["demo-04"], "men-tees": ["demo-04"],
  "men-other": ["demo-05"],
  jeans: ["demo-02", "demo-06"], jackets: ["demo-01", "demo-03"],
  tees: ["demo-04"], shirts: ["demo-05"],
};

export const demoCategories: DemoCollection[] = [
  { id: "jeans", label: "Джинси", image: "/images/storefront/jeans.jpg", alt: "Текстура синього деніму", productIds: demoCollectionProducts.jeans },
  { id: "jackets", label: "Куртки", image: "/images/storefront/men.jpg", alt: "Синя джинсова куртка на моделі", productIds: demoCollectionProducts.jackets },
  { id: "tees", label: "Футболки", image: "/images/storefront/tee.jpg", alt: "Біла футболка на вішаку", productIds: demoCollectionProducts.tees },
  { id: "shirts", label: "Сорочки", image: "/images/storefront/shirt.jpg", alt: "Біла сорочка на моделі", productIds: demoCollectionProducts.shirts },
];
