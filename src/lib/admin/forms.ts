import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { sameOrigin } from './policy';

function requestOrigin(request: NextRequest) {
  // Next's standalone server may normalize request.url to localhost internally.
  // Compare the browser Origin with the actual HTTP Host, never forwarded-host.
  const url = new URL(request.url);
  const host = request.headers.get('host');
  if (host && !/[\\/@?#\s]/.test(host)) url.host = host;
  return url.origin;
}
export function authRedirect(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, requestOrigin(request)), 303);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export function rejectCrossOrigin(request: NextRequest) {
  return !sameOrigin(request.headers.get('origin'), requestOrigin(request))
    ? new NextResponse('Заборонений запит.', { status: 403, headers: { 'Cache-Control': 'private, no-store' } }) : null;
}
export async function loginFields(request: NextRequest) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded') throw new Error('Invalid form');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty form');
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 8192) { await reader.cancel(); throw new Error('Form too large'); }
    chunks.push(value);
  }
  const fields = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  return { email: (fields.get('email') ?? '').trim(), password: fields.get('password') ?? '' };
}
