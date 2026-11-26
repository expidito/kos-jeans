import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.QUALITY_BASE??'http://127.0.0.1:3016';
const checks=[];
for(const path of ['/media/a0000000-0000-4000-8000-000000000003','/category-media/70000000-0000-4000-8000-000000000004','/banner-media/00000000-0000-4000-8000-000000000001','/admin/product-media/00000000-0000-4000-8000-000000000001']){
 const r=await fetch(base+'/_next/image?'+new URLSearchParams({url:path,w:'640',q:'75'}));assert.equal(r.status,400);checks.push({path,optimizerStatus:r.status});
}
const html=await(await fetch(base+'/product/test-wide-leg-blue')).text();
const id=html.match(/\/media\/([a-f0-9-]{36})/)?.[1];assert(id);
for(const width of [160,480,960,1440]){const r=await fetch(`${base}/media/${id}?w=${width}`);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/private.*no-store/);assert.equal(r.headers.get('content-type'),'image/webp');checks.push({width,status:r.status,bytes:(await r.arrayBuffer()).byteLength,cache:r.headers.get('cache-control')});}
for(const path of ['/admin','/admin/products','/admin/categories','/admin/orders','/admin/banners','/admin/settings']){const r=await fetch(base+path,{redirect:'manual'});assert([303,307].includes(r.status));assert.match(r.headers.get('location'),/\/admin\/login/);checks.push({path,status:r.status});}
assert.equal((await fetch(base+'/product/quality-nonexistent-slug')).status,404);
const robots=await(await fetch(base+'/robots.txt')).text();assert(robots.includes('Disallow: /'));assert(!(await(await fetch(base+'/sitemap.xml')).text()).includes('<loc>'));
await writeFile('docs/checks/quality/http-after.json',JSON.stringify({status:'passed',environment:'local production build + kos-jeans-dev',checks},null,2)+'\n');console.log('PASS private optimizer rejection, resized protected images, admin redirects, 404, noindex');
const prod='https://kos-jeans.vercel.app';const production=[];
for(const path of ['/','/delivery','/robots.txt','/sitemap.xml','/product/test-wide-leg-blue']){const r=await fetch(prod+path);const text=await r.text();assert.equal(r.status,path.startsWith('/product/')?404:200);if(path==='/robots.txt')assert(text.includes('Disallow: /'));if(path==='/sitemap.xml')assert(!text.includes('<loc>'));production.push({path,status:r.status,noindex:r.headers.get('x-robots-tag')});}
await writeFile('docs/checks/quality/production.json',JSON.stringify({status:'passed',main:'21197454df0302bc9b82cad1b377afbb19f7b688',deployment:'https://vercel.com/fedir-team/kos-jeans/7kccafPsg8s7YgDDoZ17LMKgLQw6',environmentModified:false,checks:production},null,2)+'\n');console.log('PASS Production read-only pages and dev-product isolation');
