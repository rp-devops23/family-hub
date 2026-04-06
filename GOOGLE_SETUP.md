# Google Workspace Integration — Guide de configuration

## Vue d'ensemble : comment ça fonctionne ?

L'intégration Google utilise le protocole **OAuth 2.0** — le standard universel pour qu'une app accède à des données d'un autre service sans que tu aies à lui donner ton mot de passe. Tu délègues un accès limité (lecture seule de ton agenda/emails) que tu peux révoquer à tout moment.

Le flux complet une fois configuré :
1. Tu cliques 📅 dans l'Agent → notre app appelle la fonction `google-auth-url`
2. `google-auth-url` construit une URL Google avec les permissions demandées et te redirige dessus
3. Google t'affiche une fenêtre d'autorisation → tu acceptes
4. Google redirige automatiquement vers notre fonction `google-callback` avec un code temporaire
5. `google-callback` échange ce code contre des **tokens d'accès** et les stocke en base (table `google_tokens`)
6. À chaque message envoyé à l'agent, la fonction `family-agent` lit ces tokens, les rafraîchit si nécessaire, et interroge Calendar/Gmail avant de répondre

---

## PARTIE 1 : Google Cloud Console

### Étape 1 — Créer un projet

> **Pourquoi ?** Google Cloud fonctionne par projets. Un projet est un conteneur isolé qui regroupe les APIs activées, les identifiants OAuth et les quotas d'utilisation. Sans projet, tu ne peux pas activer d'API ni créer des identifiants.

1. Va sur **[console.cloud.google.com](https://console.cloud.google.com)**
2. En haut à gauche, clique sur le **sélecteur de projet** (barre bleu foncé, à côté du logo Google Cloud)
3. Dans la fenêtre qui s'ouvre → clique **"Nouveau projet"** (en haut à droite)
4. Nom du projet : `FamilyHub`
5. Clique **"Créer"** et attends quelques secondes
6. Vérifie que ton nouveau projet est bien sélectionné dans la barre en haut

---

### Étape 2 — Activer les APIs

> **Pourquoi ?** Par défaut, aucune API Google n'est accessible. Il faut explicitement activer celles dont tu as besoin — c'est une mesure de sécurité pour éviter des accès non intentionnels. Sans activation, les appels à l'API retourneront une erreur `API not enabled`.

1. Dans le menu hamburger ☰ à gauche → **"APIs et services"** → **"Bibliothèque"**
   *(ou cherche "API Library" dans la barre de recherche en haut)*
2. Pour chaque API ci-dessous : tape son nom dans la barre de recherche → clique dessus → bouton **"Activer"** :
   - **Google Calendar API**
   - **Gmail API**

   > Google Drive API est optionnel pour l'instant, tu peux l'ignorer.

---

### Étape 3 — Configurer l'écran de consentement OAuth

> **Pourquoi ?** Avant qu'un utilisateur puisse autoriser ton app, Google doit savoir **qui est ton app** et **ce qu'elle veut faire**. L'écran de consentement est la fenêtre que l'utilisateur voit chez Google avec le nom de l'app, les permissions demandées, et qui l'a créée. Sans ça, Google ne laissera pas ton app demander des autorisations.
>
> **Comment ça marche ?** Tu définis ici l'identité de l'app (nom, email) et les *scopes* (permissions précises). En mode test, seuls les emails que tu listes peuvent s'authentifier — c'est parfait pour un usage familial sans avoir à faire valider l'app par Google.

> **Note :** L'interface Google Cloud a été redesignée. Tu verras soit l'ancienne présentation (onglets Branding / Audience / Data access / Clients), soit un assistant étape par étape. Les deux mènent au même résultat.

1. Menu gauche → **"APIs et services"** → **"Écran de consentement OAuth"**

2. **Si on te demande de choisir un type d'utilisateur :**
   - Choisis **"Externe"** → clique **"Créer"**
   - *(Externe = n'importe quel compte Google peut s'authentifier, pas seulement les comptes d'une organisation Google Workspace)*

3. **Onglet "Branding" ou section "Informations sur l'application" :**
   - Nom de l'application : `Family Hub`
   - E-mail d'assistance utilisateur : **ton adresse email**
   - Logo : laisse vide
   - Page d'accueil de l'application : laisse vide
   - Coordonnées du développeur (tout en bas) : **ton adresse email**
   - Clique **"Enregistrer et continuer"** (ou **"Save"**)

4. **Onglet "Audience" ou section "Portée" :**
   - Laisse en **mode Test** — c'est suffisant pour une app familiale
   - Ajoute ton/tes emails dans **"Utilisateurs test"** → bouton **"+ Add users"**
   > ⚠️ En mode test, Google bloque la connexion pour tout email qui n'est pas dans cette liste. Ajoute tous les membres de la famille qui utiliseront l'app.
   - Clique **"Enregistrer"**

5. **Onglet "Data access" ou section "Champs d'application" :**
   - Clique **"Ajouter ou supprimer des champs d'application"**
   - Dans la barre de recherche, ajoute ces scopes un par un :
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/gmail.readonly`
   > Ces scopes définissent exactement ce que l'app peut faire : lire le calendrier et les emails, rien d'autre. `.readonly` signifie que l'app ne peut jamais modifier ni supprimer de données.
   - Clique **"Mettre à jour"** puis **"Enregistrer et continuer"**

6. Clique **"Enregistrer"** / **"Revenir au tableau de bord"** pour terminer

---

### Étape 4 — Créer les identifiants OAuth (Client ID + Secret)

> **Pourquoi ?** Le Client ID et le Client Secret sont les "clés d'identité" de ton app auprès de Google. Quand notre fonction demande un token à Google, elle présente ces deux valeurs pour prouver qu'elle est bien ton app et non une app tierce malveillante.
>
> **Comment ça marche ?** Le Client ID est public (il apparaît dans l'URL de la page d'autorisation Google). Le Client Secret est privé — il ne doit jamais être exposé côté navigateur, c'est pour ça qu'on l'utilise uniquement dans les fonctions Supabase côté serveur. L'URI de redirection autorisée dit à Google : "après l'autorisation, renvoie l'utilisateur uniquement vers cette URL précise" — c'est une protection contre les attaques.

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
   > **Où trouver ton URL Supabase :** [app.supabase.com](https://app.supabase.com) → ton projet → **Settings → API** → copie l'**URL du projet** (format `https://xxxxxxxxxxxx.supabase.co`)
   >
   > ⚠️ N'ajoute PAS de redirect URI vers localhost. Google redirige vers la fonction Supabase (côté serveur), pas vers ton navigateur. C'est la fonction qui stocke les tokens, puis qui redirige vers ton app Vercel.

6. Clique **"Créer"**

7. Une fenêtre s'affiche avec :
   - **Client ID** : `xxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret** : `GOCSPX-xxxxxxxxxxxx`
   - **Télécharge le fichier JSON** ou copie les deux valeurs — tu en auras besoin à l'étape suivante

---

### Étape 5 — Ajouter les secrets dans Supabase

> **Pourquoi ?** Les fonctions Supabase (qui tournent côté serveur) ont besoin du Client ID et du Client Secret pour s'authentifier auprès de Google. On les stocke en tant que *secrets d'environnement* Supabase — ils sont chiffrés au repos et jamais exposés dans le code ou le navigateur. `APP_ORIGIN` permet à la fonction `google-callback` de savoir vers quelle URL Vercel rediriger après la connexion.

Dans ton terminal (dans le dossier du projet) :

```bash
npx supabase secrets set GOOGLE_CLIENT_ID="xxxxxxxxxxxx.apps.googleusercontent.com"
npx supabase secrets set GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxx"
npx supabase secrets set APP_ORIGIN="https://ton-app.vercel.app"
```

> `APP_ORIGIN` = l'URL de ton app Vercel. Tu la trouves dans le dashboard Vercel de ton projet.

Et dans le fichier `.env.functions` (pour les tests locaux) :
```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
APP_ORIGIN=https://ton-app.vercel.app
```

---

### Étape 6 — Déployer les fonctions Supabase

> **Pourquoi ?** Les trois fonctions concernées ont été modifiées ou créées depuis le dernier déploiement. Il faut les pousser sur Supabase pour que les nouvelles versions (avec le support Google) soient actives. `--no-verify-jwt` est nécessaire pour que `google-callback` soit accessible par Google sans token — Google ne peut pas s'authentifier avec un JWT Supabase quand il redirige l'utilisateur.

```bash
npx supabase functions deploy google-auth-url --no-verify-jwt
npx supabase functions deploy google-callback --no-verify-jwt
npx supabase functions deploy family-agent --no-verify-jwt
```

---

### Étape 7 — Créer la table SQL

> **Pourquoi ?** On a besoin d'un endroit sécurisé pour stocker les tokens d'accès Google de chaque utilisateur. La table `google_tokens` a une ligne par utilisateur avec le `access_token` (valable ~1h), le `refresh_token` (permanent, permet de renouveler l'access token automatiquement) et la date d'expiration. La politique RLS garantit que chaque utilisateur ne voit que ses propres tokens.

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
→ L'URI de redirection dans Google ne correspond pas exactement à l'URL de ta fonction Supabase. Vérifie l'étape 4 : pas de slash à la fin, bien `https://`, URL exacte.

**"Access blocked: FamilyHub has not completed the Google verification process"**
→ Normal en mode test ! Il faut que ton email soit dans la liste "Utilisateurs test" (étape 3, point 4).

**"This app isn't verified"**
→ Clique sur **"Paramètres avancés"** puis **"Accéder à FamilyHub (non sécurisé)"** — c'est normal pour une app personnelle en mode test, Google affiche cet avertissement par précaution.

**L'agent ne voit pas mon agenda après connexion**
→ Vérifie que les fonctions ont bien été redéployées (étape 6) et que les 3 secrets Supabase sont définis (étape 5).
