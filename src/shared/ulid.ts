// Entity ID generator. Uses the built-in Web Crypto `randomUUID` (available in
// browsers and Node 18+), called lazily at id-generation time — never at module
// import — so it can't crash the SSR bundle the way the `ulid` package did
// (that package ran a crypto check at import that threw on Vercel's SSR cold
// start). IDs are opaque strings; nothing in the app parses or sorts by them,
// so a v4 UUID is sufficient. The file name is kept for import stability.
export function newId(): string {
  return crypto.randomUUID()
}
