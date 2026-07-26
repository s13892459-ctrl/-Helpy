# Helpy

Bot Discord **sans commandes de modération** : seule `/dashboard` ouvre une interface d'administration par boutons, listes et formulaires.

## Installation

1. Installez Node.js 20+ et MongoDB (ou créez une base MongoDB Atlas).
2. Copiez `.env.example` vers `.env` et renseignez toutes les valeurs.
3. `npm install`
4. `npm run register` (une seule fois après chaque modification de la commande)
5. `npm start`

## Railway

Connectez le dépôt GitHub dans Railway, puis définissez les variables de `.env` dans **Variables**. Railway exécute automatiquement `npm start` grâce à `railway.json`.

## Permissions et sécurité

- `CREATOR_ID` est obligatoire : ce compte est le seul niveau 5 et ne peut jamais être modifié.
- Les niveaux 2 à 4 sont attribués depuis le Dashboard et contrôlés avec les rôles configurés et les permissions Discord.
- Le rôle du bot doit être au-dessus des rôles/membres à modérer et posséder les permissions nécessaires.
- Donnez au bot les intents **Server Members** et **Message Content** dans le portail Discord Developer.
