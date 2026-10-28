export function shouldShowAiCreditUpsell(input: {
  charactersEnabled: boolean
  charactersRemaining: number
  activePacks: number
}): boolean {
  if (input.activePacks <= 0) return false
  return input.charactersEnabled && input.charactersRemaining <= 0
}
