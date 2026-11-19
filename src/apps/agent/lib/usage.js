// Affichage de la consommation de l'agent (noms de modèles et montants)

export const MODEL_LABELS = {
  'claude-haiku-5-5': 'Haiku 5.5',
  'claude-sonnet-5-5': 'Sonnet 5.5',
  'claude-opus-5-5': 'Opus 5.5',
  'claude-haiku-4-5': 'Haiku 4.5',
}

export const shortModel = (id) => MODEL_LABELS[id] || String(id || '').replace(/^claude-/, '')

export function formatUsd(value) {
  const n = Number(value) || 0
  return `$${n.toFixed(n > 0 && n < 0.01 ? 4 : 2)}`
}
