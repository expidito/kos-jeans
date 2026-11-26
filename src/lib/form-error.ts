// Only deliberately authored validation messages may cross an HTTP/UI boundary.
export class FormError extends Error {}
export function publicFormMessage(error: unknown, fallback: string) {
  return error instanceof FormError ? error.message : fallback;
}
