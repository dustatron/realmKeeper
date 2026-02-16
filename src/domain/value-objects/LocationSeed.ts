export interface LocationSeed {
  // Constructed (ruins, dungeons, camps, fortifications)
  purpose?: string
  creator?: string
  entrance?: string
  composition?: string
  condition?: string
  ruinCause?: string
  // Natural (natural, landmark, shrine)
  ecology?: string
  terrain?: string
  hazards?: string
  resources?: string
  // Universal
  lore?: string
  secret?: string
}
