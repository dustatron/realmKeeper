export interface TravelTimeInput {
  baseTravelWatches: number
  terrain: string
  weatherCondition?: string
}

export function calculateTravelTime(input: TravelTimeInput): number {
  let multiplier = 1.0

  switch (input.terrain.toLowerCase()) {
    case 'mountain':
    case 'swamp':
      multiplier *= 2.0
      break
    case 'forest':
    case 'hills':
      multiplier *= 1.5
      break
    case 'desert':
    case 'highlands':
      multiplier *= 1.5
      break
    case 'wetlands':
      multiplier *= 2.0
      break
    case 'fields':
      multiplier *= 1.0
      break
    case 'road':
      multiplier *= 0.75
      break
  }

  if (input.weatherCondition) {
    const w = input.weatherCondition.toLowerCase()
    if (w.includes('storm') || w.includes('blizzard') || w.includes('hurricane')) {
      multiplier *= 2.0
    } else if (w.includes('rain') || w.includes('snow') || w.includes('fog')) {
      multiplier *= 1.5
    }
  }

  return Math.max(1, Math.ceil(input.baseTravelWatches * multiplier))
}
