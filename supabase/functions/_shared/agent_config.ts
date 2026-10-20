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
  //
  // L'utilisateur choisit un MODE dans l'application (table agent_settings).
  // Le mode par défaut est le moins cher. Les prix sont en dollars par million de
  // tokens et ne servent qu'à ESTIMER le coût affiché (ils peuvent évoluer : vérifier
  // sur la page de tarifs d'Anthropic).
  // --------------------------------------------------------------------------
  models: {
    /** Modes proposés à l'utilisateur */
    modes: {
      /** Le moins cher : toujours Haiku */
      economy: { model: 'claude-haiku-5-5', effort: 'low', price: { input: 0.10, output: 0.50 } },
      /** Compromis : toujours Sonnet */
      balanced: { model: 'claude-sonnet-5-5', effort: 'medium', price: { input: 2.0, output: 10.0 } },
      /** Le plus capable : Opus */
      quality: { model: 'claude-opus-5-5', effort: 'medium', price: { input: 4.0, output: 20.0 } },
    },

    /** Mode « auto » : économique pour les questions simples, équilibré pour les questions complexes */
    autoSimple: 'economy',
    autoComplex: 'balanced',

    /** Mode utilisé si l'utilisateur n'a rien choisi (ou si la table agent_settings est absente) */
    defaultMode: 'economy',

    /**
     * Modèle de secours si le modèle choisi est refusé par l'API (400/404) dès le premier appel.
     * Pas de paramètre `effort` : il n'est pas accepté par ce modèle.
     */
    fallback: { model: 'claude-haiku-4-5', price: { input: 1.0, output: 5.0 } },

    /** Nombre maximum de tokens dans la réponse (la réflexion du modèle en fait partie) */
    maxTokens: 4096,

    /**
     * Mots-clés qui, en mode « auto », déclenchent le modèle « équilibré » à la place de l'économique.
     */
    smartKeywords: [
      'analyse', 'analyze',
      'compare', 'comparaison',
      'tendance', 'trend',
      'prevision', 'forecast',
      'explique', 'explain',
      'pourquoi', 'why',
      'strategie', 'strategy',
      // Actions : le modèle plus puissant gère mieux les appels d'outils
      'ajoute', 'ajouter', 'add', 'crée', 'créer', 'create',
      'planifie', 'planifier', 'plan', 'coche', 'cocher', 'check',
      'dépensé', 'dépense', 'spent', 'acheté', 'payé', 'paid',
      'revenu', 'salaire', 'income', 'reçu', 'received',
      'tâche', 'tache', 'task', 'menu', 'dîner', 'diner', 'dinner',
    ],

    /** Longueur minimale d'un message (en caractères) pour passer en « équilibré » en mode auto */
    smartMinLength: 300,
  },

}
