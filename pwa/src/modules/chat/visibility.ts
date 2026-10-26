export function shouldShowFloatingChat(input: {
  chatEnabled: boolean
  pathname: string
  selectedTemplate: string | null | undefined
}): boolean {
  if (!input.chatEnabled) return false
  if (input.pathname !== '/') return true
  return !input.selectedTemplate || input.selectedTemplate === 'minimalista'
}
