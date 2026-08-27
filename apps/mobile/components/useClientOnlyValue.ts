// This function is web-only as native doesn't currently support server (or build-time) rendering.
// `_server` is kept (unused on this native-only path) to match the signature a `.web.ts` variant
// would need if one is ever added, so call sites don't have to care which platform file resolves.
export function useClientOnlyValue<S, C>(_server: S, client: C): S | C {
  return client;
}
