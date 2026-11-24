import 'server-only';
import { requireAdmin } from './auth';

export async function getDashboard() {
  const { client } = await requireAdmin();
  const results = await Promise.all([
    client.from('products').select('id', { count: 'exact', head: true }),
    client.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    client.from('categories').select('id', { count: 'exact', head: true }),
    client.from('orders').select('id', { count: 'exact', head: true }),
    client.from('product_variants').select('id,product_id,sku,size,color,stock,products(name,status)').eq('is_active', true).lte('stock', 3).order('stock').order('id').limit(8),
    client.from('product_variants').select('id', { count: 'exact', head: true }).eq('is_active', true).lte('stock', 3),
  ]);
  return {
    counts: results.slice(0, 4).map(r => r.error ? null : r.count),
    low: results[4].error ? null : results[4].data,
    lowCount: results[5].error ? null : results[5].count,
  };
}
