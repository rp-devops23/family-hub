// Modèles proposés dans les réglages de l'agent

// Modes « Anthropic direct » (clé ANTHROPIC_API_KEY de la fonction)
export const ANTHROPIC_MODES = [
  {
    id: 'economy', icon: '🌱',
    fr: ['Économique', 'Le moins cher (Claude Haiku 5.5). Idéal pour les courses, les repas et les tâches.'],
    en: ['Economy', 'The cheapest (Claude Haiku 5.5). Great for groceries, meals and tasks.'],
  },
  {
    id: 'auto', icon: '⚖️',
    fr: ['Auto', 'Économique pour les demandes simples, plus puissant pour les analyses et les actions complexes.'],
    en: ['Auto', 'Economy for simple requests, more capable for analyses and complex actions.'],
  },
  {
    id: 'balanced', icon: '🎯',
    fr: ['Équilibré', 'Toujours Claude Sonnet 5.5 : plus fin, coûte plus cher.'],
    en: ['Balanced', 'Always Claude Sonnet 5.5: more nuanced, costs more.'],
  },
  {
    id: 'quality', icon: '🚀',
    fr: ['Maximum', 'Claude Opus 5.5 : le plus capable, et le plus cher.'],
    en: ['Maximum', 'Claude Opus 5.5: the most capable, and the most expensive.'],
  },
]

// Liste proposée au premier affichage : tous désactivés, l'utilisateur active ceux qu'il veut
export const DEFAULT_OPENROUTER_MODELS = [
  'google/gemini-4-neon',
  'google/gemini-4-hydrogen',
  'anthropic/claude-fable-5.2',
  'openrouter/auto',
  'anthropic/claude-opus-5.5',
  'openai/gpt-6.1-sol',
  'anthropic/claude-sonnet-5.5',
  'anthropic/claude-haiku-5.5',
]

// Identifiant OpenRouter : « fournisseur/modèle » (le suffixe « :variante » est permis), sans espace
export const isValidModelId = (id) => /^\S+\/\S+$/.test(id) && id.length >= 3 && id.length <= 200
