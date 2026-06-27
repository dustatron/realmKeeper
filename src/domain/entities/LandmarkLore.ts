export interface LandmarkLore {
  legend: string             // what locals believe
  truth: string              // the NATURE of the place (not a discoverable)
  secret: string             // a concrete DISCOVERABLE (cache, name, passage)
  interactionTrigger: string // "When you {touch the stone / sleep here}"
  interactionEffect: string  // narrative result: boon|curse|omen|vision|warning|nothing
  questHook: string          // points the party outward
  sensory: string
}
