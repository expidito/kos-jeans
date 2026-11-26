// Per-network-operation deadline. Preserve the caller's cancellation and never cache Auth/data.
export function createBoundedFetch(fetcher: typeof fetch = fetch, timeoutMs = 12000): typeof fetch {
  return (input, init) => {
    const caller = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const timeout = AbortSignal.timeout(timeoutMs);
    return fetcher(input, { ...init, cache: 'no-store', signal: caller ? AbortSignal.any([caller, timeout]) : timeout });
  };
}
export const supabaseFetch = createBoundedFetch();
