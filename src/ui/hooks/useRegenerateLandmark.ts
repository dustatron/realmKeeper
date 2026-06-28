import { useCallback } from 'react'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeGenerateLandmark } from '@application/use-cases/GenerateLandmark'
import { newId } from '@shared/ulid'

export function useRegenerateLandmark() {
  const container = useContainer()
  return useCallback(async (poiId: string) => {
    await executeGenerateLandmark(
      { poiId, seed: `landmark-${newId()}` },
      { poiRepo: container.poiRepo, regionRepo: container.regionRepo },
    )
  }, [container])
}
