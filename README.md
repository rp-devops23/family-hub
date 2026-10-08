# Family Hub 🏠

Application familiale React + Vite + Supabase. Gérez vos finances, recettes, tâches ménagères et bénéficiez d'un assistant IA.

## Applications

| App | Description |
|-----|-------------|
| 💰 **Finances** | Transactions (revenus & dépenses), budgets, récurrences, insights |
| 🍽️ **Recettes** | Recettes, planning de repas, liste de courses |
| ✅ **Tâches** | Corvées et travaux maison avec dates d'échéance |
| 🤖 **Agent IA** | Assistant familial — accès aux données de toutes les apps + Google Calendar/Gmail |

## Stack technique

- **Frontend** : React 19 + Vite 7
- **Base de données** : Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **Charts** : Recharts
- **IA** : Anthropic API (claude-haiku / claude-sonnet)
- **Deploy** : Vercel
- **PWA** : manifest.json + service worker

## Structure

```
src/
├── apps/
│   ├── finance/       # App finances complète
│   ├── recipes/       # App recettes + calendrier + courses
│   ├── tasks/         # App tâches (corvées & travaux)
│   └── agent/         # Chat IA + intégration Google
├── portal/            # Page d'accueil (sélecteur d'app)
├── context/           # AuthContext (auth + langue)
└── lib/supabase.js
supabase/
├── functions/         # Edge Functions Deno
│   ├── family-agent/  # Agent IA principal
│   ├── google-auth-url/
│   ├── google-callback/
│   └── _shared/       # Utilitaires partagés (config, Google refresh)
└── migrations/        # Scripts SQL à exécuter dans Supabase
```

## Démarrage

```bash
npm install
npm run dev
```

Variables d'environnement (`.env`) :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Migrations SQL

À exécuter dans Supabase → SQL Editor, dans l'ordre :

1. `agent_tables.sql` — conversations & messages de l'agent
2. `google_tokens.sql` — tokens OAuth Google
3. `tasks_table.sql` — tâches corvées/travaux
4. `add_transaction_type.sql` — colonne type sur transactions
5. `add_recurring_type.sql` — colonne type sur recurring_templates

## Intégration Google

Voir `GOOGLE_SETUP.md` pour configurer Google Calendar et Gmail.
