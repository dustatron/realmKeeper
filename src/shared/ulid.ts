import { monotonicFactory } from 'ulid'

// The ulid package's default `ulid` export eagerly calls `detectPrng()` at
// module import. On runtimes where the secure crypto global isn't present at
// import time (e.g. Vercel's SSR cold start) detectPrng THROWS
// ("secure crypto unusable, insecure Math.random not allowed") instead of
// degrading, which crashes the entire SSR bundle. Supplying our own PRNG to
// monotonicFactory means detectPrng is never called, so import never throws;
// the PRNG resolves crypto lazily at id-generation time, where it's available
// (browser + Node 18+ both expose globalThis.crypto.getRandomValues).
function prng(): number {
  const c = globalThis.crypto
  if (c?.getRandomValues) {
    const buf = new Uint8Array(1)
    c.getRandomValues(buf)
    return buf[0] / 0xff
  }
  // ULIDs are not security tokens; Math.random is an acceptable last resort.
  return Math.random()
}

const generate = monotonicFactory(prng)

export function newId(): string {
  return generate()
}
