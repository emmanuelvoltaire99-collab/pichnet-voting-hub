# Pichnet Stars

Crée le MVP du site officiel MISS & MASTER PICHNET 2026, une plateforme web moderne permettant au public de découvrir les candidates Miss et les candidats Master, consulter leur profil et effectuer des votes payants.

STACK

Next.js + TypeScript

Tailwind CSS

Supabase PostgreSQL

Supabase Auth

Supabase Storage

Supabase Edge Functions

Architecture propre, modulaire et évolutive.

IDENTITÉ VISUELLE

Respecter strictement la charte graphique PICHNET :

Noir "#121212"

Blanc "#FFFFFF"

Vert "#2E7D32"

Jaune "#FBC02D"

Magenta "#C2185B"

Police principale : Poppins

Design premium, minimaliste, moderne et responsive.

Ajouter subtilement des motifs géométriques inspirés de la culture et des textiles camerounais.

NE JAMAIS modifier, redessiner ou altérer le logo PICHNET.

Prévoir "/public/branding/pichnet-logo.png".

PAGES

Créer :

"/" — Accueil

"/miss" — Candidates

"/master" — Candidats

"/candidat/[id]" — Profil candidat

"/classement" — Classement

"/vote" — Processus de vote

"/admin" — Administration

ACCUEIL

Hero :

MISS & MASTER PICHNET 2026

La beauté, l'élégance et la culture camerounaise.

Boutons :

VOTER MAINTENANT / DÉCOUVRIR LES CANDIDATS

CANDIDATS

Chaque carte affiche :

Photo

Numéro

Nom

Catégorie

Région/ville

Nombre de votes

Bouton VOTER

Les photos seront ajoutées ultérieurement par l'administrateur via Supabase Storage. Ne pas inventer de vraies photos ou informations.

VOTES PAYANTS

Prévoir des packs configurables depuis Supabase, par exemple :

1 vote → 100 FCFA

5 votes → 500 FCFA

10 votes → 1 000 FCFA

25 votes → 2 500 FCFA

50 votes → 5 000 FCFA

Ces valeurs ne doivent pas être codées en dur.

Flux :

Candidat → Pack → Paiement → Vérification serveur → Vote validé → Classement actualisé

Ne jamais permettre au frontend de modifier directement le nombre de votes.

Préparer une abstraction "PaymentProvider" pour connecter ultérieurement un prestataire de paiement compatible avec le Cameroun. Ne pas simuler un paiement réel dans le MVP.

SUPABASE

Créer :

"candidates"

id

first_name

last_name

candidate_number

category

region

city

biography

photo_url

is_active

created_at

"vote_packages"

id

name

vote_quantity

price

currency

is_active

"payments"

id

user_id

candidate_id

package_id

amount

currency

payment_method

transaction_reference

status

created_at

"votes"

id

candidate_id

user_id

payment_id

quantity

created_at

Créer le bucket Storage :

"candidate-photos/miss/"

"candidate-photos/master/"

Activer Row Level Security et protéger toutes les opérations sensibles.

ADMIN

Le dashboard doit permettre de :

Ajouter/modifier/désactiver Miss et Master

Télécharger/modifier les photos

Modifier les biographies et informations

Gérer les packs de votes

Voir les paiements

Voir le nombre de votes

Consulter le classement

Voir quelques statistiques générales

CLASSEMENT

Afficher séparément :

MISS

🥇 1ère

🥈 2ème

🥉 3ème

MASTER

Le classement doit être basé uniquement sur les votes validés.

UX

Mobile First, rapide et simple.

Priorité :

Photo → Profil → Voter → Pack → Paiement → Confirmation

Utiliser des animations légères uniquement si elles améliorent l'expérience.

Prévoir loading states, erreurs, états vides et images manquantes.

IMPORTANT

Ne pas inventer :

logo PICHNET

photos officielles

résultats

sponsors

partenaires

moyens de paiement disponibles

Utiliser des données fictives uniquement pour tester l'interface et les identifier clairement comme DEMO.

Le résultat final doit être simple, élégant, moderne, culturellement camerounais et immédiatement reconnaissable comme une plateforme PICHNET, tout en restant facilement extensible après le MVP.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9f1d3db6-de41-4adc-a497-19861fb1d774).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
