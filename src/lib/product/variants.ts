export type ProductVariant = { id: string; product_id: string; sku: string; size: string; color: string; stock: number; is_active: boolean };
export type CartSelection = { productId: string; variantId: string; size: string; color: string; quantity: number };

export function variantColors(variants: readonly ProductVariant[]) {
  return [...new Set(variants.filter(v => v.is_active).map(v => v.color))];
}
export function variantSizes(variants: readonly ProductVariant[], color: string) {
  return [...new Set(variants.filter(v => v.is_active).map(v => v.size))].sort((a,b) => a.localeCompare(b,'uk',{numeric:true})).map(value => ({
    value, available: variants.some(v => v.is_active && v.color === color && v.size === value && v.stock > 0),
  }));
}
export function findVariant(variants: readonly ProductVariant[], color: string, size: string) {
  return variants.find(v => v.is_active && v.color === color && v.size === size && v.stock > 0) ?? null;
}
export function cartSelection(productId: string, variant: ProductVariant | null, quantity: number): CartSelection | null {
  if (!variant || variant.product_id !== productId || !variant.is_active || variant.stock < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > variant.stock) return null;
  return {productId,variantId:variant.id,size:variant.size,color:variant.color,quantity};
}
