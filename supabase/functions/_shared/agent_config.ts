// ============================================================================
// AGENT CONFIG — Paramètres centralisés de l'agent IA
// Modifie ce fichier pour ajuster le comportement de l'agent.
// ============================================================================

export const AGENT_CONFIG = {

  // --------------------------------------------------------------------------
  // Fuseau horaire de la famille (pour « aujourd'hui », « hier », « ce soir »)
  // --------------------------------------------------------------------------
  timezone: 'Europe/Paris',

  // --------------------------------------------------------------------------
  // Limites des outils de lecture (l'agent interroge les données à la demande)
  // --------------------------------------------------------------------------
  tools: {
    /** Nombre maximum de transactions renvoyées par list_transactions */
    transactionsListLimit: 50,

    /** Nombre maximum de transactions lues pour calculer un résumé (5 pages de 1000) */
    spendingScanLimit: 5000,

    /** Nombre maximum de recettes renvoyées par search_recipes */
    recipesLimit: 15,

    /** Nombre maximum d'éléments (articles, dates…) par appel d'un outil d'écriture */
    writeBatchLimit: 30,

    /** Fenêtre par défaut de l'agenda Google (jours) et maximum autorisé */
    calendarDaysDefault: 14,
    calendarDaysMax: 60,

    /** Nombre d'emails renvoyés par défaut et au maximum */
    emailsDefault: 10,
    emailsMax: 20,
  },

  // --------------------------------------------------------------------------
  // Boucle de l'agent
  // --------------------------------------------------------------------------
  loop: {
    /** Nombre maximum d'allers-retours modèle ↔ outils pour une même question */
    maxSteps: 6,

    /** Nombre maximum d'appels d'outils au total pour une même question */
    maxToolCalls: 12,
  },

  // --------------------------------------------------------------------------
  // Historique de conversation
  // --------------------------------------------------------------------------
  conversation: {
    /** Nombre de messages RÉCENTS chargés depuis l'historique pour le contexte */
    historyLimit: 40,
  },

  // --------------------------------------------------------------------------
  // Modèles Anthropic
  // --------------------------------------------------------------------------
  models: {
    /** Modèle utilisé pour les questions simples */
    fast: 'claude-haiku-4-5-20251001',

    /** Modèle utilisé pour les questions complexes (analyses, comparaisons…) */
    smart: 'claude-sonnet-4-6',

    /** Nombre maximum de tokens dans la réponse de l'agent */
    maxTokens: 2048,

    /**
     * Mots-clés qui déclenchent le modèle "smart" à la place du modèle "fast".
     * Ajouter un mot ici force l'usage du modèle plus puissant pour ce type de question.
     */
    smartKeywords: [
      'analyse', 'analyze',
      'compare', 'comparaison',
      'tendance', 'trend',
      'prevision', 'forecast',
      'explique', 'explain',
      'pourquoi', 'why',
      'strategie', 'strategy',
      // Actions : le modèle puissant gère mieux les appels d'outils
      'ajoute', 'ajouter', 'add', 'crée', 'créer', 'create',
      'planifie', 'planifier', 'plan', 'coche', 'cocher', 'check',
      'dépensé', 'dépense', 'spent', 'acheté', 'payé', 'paid',
      'revenu', 'salaire', 'income', 'reçu', 'received',
      'tâche', 'tache', 'task', 'menu', 'dîner', 'diner', 'dinner',
    ],

    /**
     * Longueur minimale d'un message (en caractères) pour forcer le modèle "smart",
     * indépendamment des mots-clés.
     */
    smartMinLength: 300,
  },

}
