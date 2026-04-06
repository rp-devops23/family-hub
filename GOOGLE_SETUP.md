# Google Workspace Integration — Setup Guide

## PARTIE 1 : Google Cloud Console

### Étape 1 — Créer / sélectionner un projet

1. Va sur [console.cloud.google.com](https://console.cloud.google.com)
2. En haut à gauche, clique sur le sélecteur de projet → **"Nouveau projet"**
3. Nom : `FamilyHub` (ou le nom de ton choix)
4. Clique **"Créer"**

---

### Étape 2 — Activer les APIs

Dans le menu gauche : **APIs & Services → Bibliothèque**

Active les APIs suivantes une par une :
- **Google Calendar API**
- **Gmail API**
- **Google Drive API**

Pour chaque API : cherche son nom → clique dessus → bouton **"Activer"**

---

### Étape 3 — Configurer l'écran de consentement OAuth

Menu gauche : **APIs & Services → Écran de consentement OAuth**

1. Type d'utilisateur : **Externe** → "Créer"
2. Remplis les champs obligatoires :
   - Nom de l'application : `Family Hub`
   - E-mail d'assistance : ton email
   - Logo : optionnel
   - Domaines autorisés : ton domaine Vercel (ex. `familyhub.vercel.app`)
   - Contact développeur : ton email
3. Clique **"Enregistrer et continuer"**
4. **Champs d'application (Scopes)** → clique "Ajouter ou supprimer des champs d'application" :
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
5. Clique **"Enregistrer et continuer"** jusqu'à la fin
6. Sur la page récapitulative → **"Publier l'application"** (pour un accès externe)
   - Si tu restes en mode test, tu dois ajouter tes emails dans "Utilisateurs test"

---

### Étape 4 — Créer les identifiants OAuth 2.0

Menu gauche : **APIs & Services → Identifiants**

1. Clique **"+ Créer des identifiants"** → **"ID client OAuth"**
2. Type d'application : **Application Web**
3. Nom : `FamilyHub Web`
4. **URI de redirection autorisés** — ajoute ces deux URLs :
   - `https://<ton-projet>.supabase.co/functions/v1/google-callback`
   - `http://localhost:5173/auth/google/callback` (pour le dev local, si besoin)
5. Clique **"Créer"**
6. Une fenêtre s'ouvre avec :
   - **Client ID** : `xxxxxxxx.apps.googleusercontent.com`
   - **Client Secret** : `GOCSPX-xxxxxxxx`
7. **Copie ces deux valeurs** — tu en auras besoin à l'étape suivante

---

### Étape 5 — Ajouter les secrets dans Supabase

Dans ton terminal, exécute :

```bash
npx supabase secrets set GOOGLE_CLIENT_ID="ton-client-id.apps.googleusercontent.com"
npx supabase secrets set GOOGLE_CLIENT_SECRET="GOCSPX-ton-secret"
npx supabase secrets set APP_ORIGIN="https://ton-app.vercel.app"
```

Et en local dans `.env.functions` :
```
GOOGLE_CLIENT_ID=ton-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-ton-secret
APP_ORIGIN=https://ton-app.vercel.app
```

---

### Note sur les comptes multiples

L'intégration supporte **un compte Google par utilisateur FamilyHub** stocké dans la table `google_tokens`. L'utilisateur peut connecter/déconnecter son compte depuis l'interface Agent IA.

---

## Récapitulatif des variables d'environnement requises

| Variable | Source |
|---|---|
| `SUPABASE_URL` | Auto (Supabase built-in) |
| `SUPABASE_ANON_KEY` | Auto (Supabase built-in) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto (Supabase built-in) |
| `ANTHROPIC_API_KEY` | `npx supabase secrets set` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| `APP_ORIGIN` | URL Vercel (ex. `https://familyhub.vercel.app`) |
