# Google Workspace Integration — Guide de configuration

## À quoi sert ce guide ?

L'intégration Google permet à l'Agent IA d'accéder à ton **agenda Google Calendar** et tes **emails Gmail non lus**.

Le flux OAuth est le suivant :
1. Tu cliques 📅 dans l'Agent → l'app demande une URL de connexion à Google
2. Google te demande d'autoriser l'accès
3. Google redirige vers la **fonction Supabase** `google-callback` (pas vers ton app directement)
4. La fonction stocke les tokens en base, puis redirige vers ton app Vercel
5. L'agent utilise les tokens pour lire ton agenda/emails à chaque message

---

## PARTIE 1 : Google Cloud Console

### Étape 1 — Créer un projet

1. Va sur **[console.cloud.google.com](https://console.cloud.google.com)**
2. En haut à gauche, clique sur le **sélecteur de projet** (barre bleu foncé, à côté du logo Google Cloud)
3. Dans la fenêtre qui s'ouvre → clique **"Nouveau projet"** (en haut à droite)
4. Nom du projet : `FamilyHub`
5. Clique **"Créer"** et attends quelques secondes
6. Vérifie que ton nouveau projet est bien sélectionné dans la barre en haut

---

### Étape 2 — Activer les APIs

1. Dans le menu hamburger ☰ à gauche → **"APIs et services"** → **"Bibliothèque"**
   *(ou cherche "API Library" dans la barre de recherche en haut)*
2. Pour chaque API ci-dessous : tape son nom dans la barre de recherche → clique dessus → bouton **"Activer"** :
   - **Google Calendar API**
   - **Gmail API**

   > Google Drive API est optionnel pour l'instant, tu peux l'ignorer.

---

### Étape 3 — Configurer l'écran de consentement OAuth

> **Note :** L'interface Google Cloud a été redesignée. Tu verras soit l'ancienne présentation (onglets Branding / Audience / Data access / Clients), soit un assistant étape par étape. Les deux mènent au même résultat.

1. Menu gauche → **"APIs et services"** → **"Écran de consentement OAuth"**

2. **Si on te demande de choisir un type d'utilisateur :**
   - Choisis **"Externe"** → clique **"Créer"**
   - *(Externe = tu peux te connecter avec n'importe quel compte Google)*

3. **Onglet "Branding" ou section "Informations sur l'application" :**
   - Nom de l'application : `Family Hub`
   - E-mail d'assistance utilisateur : **ton adresse email**
   - Logo : laisse vide
   - Page d'accueil de l'application : laisse vide
   - Coordonnées du développeur (tout en bas) : **ton adresse email**
   - Clique **"Enregistrer et continuer"** (ou **"Save"**)

4. **Onglet "Audience" (ou section "Portée") :**
   - Laisse en **mode Test** — c'est suffisant pour une app familiale
   - En mode test : ajoute ton/tes emails dans **"Utilisateurs test"** → bouton **"+ Add users"**
     *(sinon Google refusera la connexion)*
   - Clique **"Enregistrer"**

5. **Onglet "Data access" ou section "Champs d'application" :**
   - Clique **"Ajouter ou supprimer des champs d'application"**
   - Dans la barre de recherche, ajoute ces scopes un par un :
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/gmail.readonly`
   - Clique **"Mettre à jour"** puis **"Enregistrer et continuer"**

6. Clique **"Enregistrer"** / **"Revenir au tableau de bord"** pour terminer

---

### Étape 4 — Créer les identifiants OAuth (Client ID)

1. Menu gauche → **"APIs et services"** → **"Identifiants"**
   *(ou onglet **"Clients"** si tu es encore sur l'écran de consentement OAuth)*

2. Clique **"+ Créer des identifiants"** → **"ID client OAuth"**

3. **Type d'application :** Application Web

4. **Nom :** `FamilyHub Web` (ou ce que tu veux)

5. **URI de redirection autorisés** — c'est la partie la plus importante :
   - Clique **"+ Ajouter un URI"**
   - Colle cette URL (remplace `<ton-projet>` par ton ID de projet Supabase) :
     ```
     https://<ton-projet>.supabase.co/functions/v1/google-callback
     ```
   > Où trouver ton URL Supabase : [app.supabase.com](https://app.supabase.com) → ton projet → **Settings → API** → copie l'**URL du projet** (format `https://xxxxxxxxxxxx.supabase.co`)

   > ⚠️ N'ajoute PAS de redirect URI vers localhost — le callback va directement vers Supabase, pas vers ton navigateur.

6. Clique **"Créer"**

7. Une fenêtre s'affiche avec :
   - **Client ID** : `xxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret** : `GOCSPX-xxxxxxxxxxxx`
   - **Télécharge le fichier JSON** ou copie les deux valeurs — tu en auras besoin juste après

---

### Étape 5 — Ajouter les secrets dans Supabase

Dans ton terminal (dans le dossier du projet) :

```bash
npx supabase secrets set GOOGLE_CLIENT_ID="xxxxxxxxxxxx.apps.googleusercontent.com"
npx supabase secrets set GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxx"
npx supabase secrets set APP_ORIGIN="https://ton-app.vercel.app"
```

> `APP_ORIGIN` = l'URL de ton app Vercel. Exemple : `https://family-hub-rp.vercel.app`
> Tu la trouves dans le dashboard Vercel de ton projet.

Et dans le fichier `.env.functions` (pour les tests locaux) :
```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
APP_ORIGIN=https://ton-app.vercel.app
```

---

### Étape 6 — Déployer les fonctions Supabase

```bash
npx supabase functions deploy google-auth-url --no-verify-jwt
npx supabase functions deploy google-callback --no-verify-jwt
npx supabase functions deploy family-agent --no-verify-jwt
```

---

### Étape 7 — Créer la table SQL

Dans **Supabase → SQL Editor**, exécute le contenu de :
```
supabase/migrations/google_tokens.sql
```

---

## C'est prêt !

Dans l'app → Agent IA → bouton 📅 en haut → **"Connecter Google"** → autoriser l'accès → l'agent voit maintenant ton agenda et tes emails.

---

## Récapitulatif des variables d'environnement

| Variable | Source |
|---|---|
| `SUPABASE_URL` | Auto (Supabase built-in) |
| `SUPABASE_ANON_KEY` | Auto (Supabase built-in) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto (Supabase built-in) |
| `ANTHROPIC_API_KEY` | Déjà configuré |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Identifiants |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Identifiants |
| `APP_ORIGIN` | URL Vercel de ton app |

---

## Dépannage fréquent

**"Error 400: redirect_uri_mismatch"**
→ L'URI de redirection dans Google ne correspond pas exactement à l'URL de ta fonction Supabase. Vérifie l'étape 4, aucun slash de fin, pas de http vs https.

**"Access blocked: FamilyHub has not completed the Google verification process"**
→ Normal en mode test ! Il faut que ton email soit dans la liste "Utilisateurs test" (étape 3, point 4).

**"This app isn't verified"**
→ Clique sur **"Paramètres avancés"** puis **"Accéder à FamilyHub (non sécurisé)"** — c'est normal pour une app personnelle en mode test.

**L'agent ne voit pas mon agenda après connexion**
→ Vérifie que les fonctions ont bien été redéployées avec `--no-verify-jwt` et que les 3 secrets Supabase sont bien définis.
