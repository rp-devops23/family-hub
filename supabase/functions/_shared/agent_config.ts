// ============================================================================
// AGENT CONFIG — Paramètres centralisés de l'agent IA
// Modifie ce fichier pour ajuster le comportement de l'agent.
// ============================================================================

export const AGENT_CONFIG = {

  // --------------------------------------------------------------------------
  // Données financières (base de données)
  // --------------------------------------------------------------------------
  finance: {
    /** Nombre de transactions récentes transmises à l'agent */
    transactionsLimit: 100,

    /** Nombre de budgets actifs transmis à l'agent */
    budgetsLimit: 20,
  },

  // --------------------------------------------------------------------------
  // Recettes & courses (base de données)
  // --------------------------------------------------------------------------
  recipes: {
    /** Nombre de recettes transmises à l'agent */
    recipesLimit: 15,

    /** Nombre d'articles de liste de courses (non cochés) transmis à l'agent */
    shoppingItemsLimit: 20,
  },

  // --------------------------------------------------------------------------
  // Google Calendar
  // --------------------------------------------------------------------------
  calendar: {
    /** Nombre de jours à venir affichés dans l'agenda (à partir d'aujourd'hui) */
    daysAhead: 30,

    /** Nombre maximum d'événements transmis à l'agent */
    eventsLimit: 50,
  },

  // --------------------------------------------------------------------------
  // Gmail
  // --------------------------------------------------------------------------
  gmail: {
    /** Nombre de messages récents transmis à l'agent (lus + non lus) */
    messagesLimit: 100,
  },

  // --------------------------------------------------------------------------
  // Historique de conversation
  // --------------------------------------------------------------------------
  conversation: {
    /** Nombre de messages chargés depuis l'historique pour le contexte */
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
    maxTokens: 1024,

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
    ],

    /**
     * Longueur minimale d'un message (en caractères) pour forcer le modèle "smart",
     * indépendamment des mots-clés.
     */
    smartMinLength: 300,
  },

}
