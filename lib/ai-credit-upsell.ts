export function shouldShowAiCreditUpsell(input: {
  charactersEnabled: boolean
  charactersRemaining: number
  musicEnabled: boolean
  musicRemainingSeconds: number
  activePacks: number
}): boolean {
  if (input.activePacks <= 0) return false
  return (
    (input.charactersEnabled && input.charactersRemaining <= 0) ||
    (input.musicEnabled && input.musicRemainingSeconds <= 0)
  )
}
