# projectCPH.ioi — Guide rapide & fonctionnalités

Ce README résume les fonctionnalités de l'application, l'architecture principale, les fichiers importants et les commandes pour lancer / tester / dépanner localement. Rédigé en français pour aller vite.

## Résumé
Application Next.js (App Router) qui gère un catalogue de livres, inventaire, réceptions (scanner), commandes, panier et réservations. Stockage des images via Supabase Storage. Tests E2E avec Playwright et tests unitaires avec Vitest.

## Fonctionnalités principales
- Authentification : inscription / login (`src/app/api/signup`, `src/app/api/login`, `component/LoginForm.tsx`).
- Catalogue / livres : création, lecture, mise à jour, suppression (`src/app/api/livre/route.ts`).
- Inventaire : liste, recherche, réception (scanner) (`src/app/inventaire`, `component/inventaire.tsx`).
- Scanner de réception : capture / scan pour créer une fiche livre et réceptionner (`component/ScannerResception.tsx`, `src/app/inventaire/scannerresception`).
- Commandes & panier : création, pagination, statuts (`src/app/commande`, `src/app/api/commande`, `src/app/api/commandePagination`).
- Réservations : réservation d'exemplaires (`src/app/api/reservations`, `src/app/api/reserverLivre`).
- Statistiques : dashboard (chart) (`src/app/statistique`, `component/statistique.tsx`).
- Upload d'images : compression côté client + upload vers Supabase (helpers dans `lib/`) et endpoint serveur optionnel (`src/app/api/uploadImageAndThumb.ts`).
- Logs client → serveur pour debug mobile : `src/app/api/logClientError/route.ts`.

## Arborescence et fichiers clés (où regarder)
- Pages / layout
  - `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/acceuil/page.tsx`
- Pages principales
  - `src/app/commande/page.tsx` — commandes
  - `src/app/compte/page.tsx` — compte utilisateur
  - `src/app/inventaire/page.tsx` — inventaire
  - `src/app/inventaire/scannerresception/page.tsx` — scanner de réception
  - `src/app/statistique/page.tsx` — statistiques
- Composants UI
  - `component/navbar.tsx`, `component/LoginForm.tsx`, `component/ScannerResception.tsx`, `component/commande.tsx`, `component/inventaire.tsx`, `component/monCompte.tsx`
- API routes (server-side)
  - `src/app/api/signup/route.tsx`, `src/app/api/login/route.ts`, `src/app/api/livre/route.ts`, `src/app/api/inventaire/route.ts`, `src/app/api/commande/route.ts`, `src/app/api/reservations/route.ts`, etc.
  - Debug : `src/app/api/logClientError/route.ts`
  - Upload helper (server) : `src/app/api/uploadImageAndThumb.ts`
- Libs / util
  - Supabase clients :
    - client (browser) : `lib/supabase/clients.ts`
    - server factory : `lib/supabase/server.ts`
  - Compression / upload client :
    - `lib/imageCompression.ts` (canvas / createImageBitmap → WebP)
    - `lib/supabaseUpload.ts` (compress + upload + generation thumb + forward logs)
  - `lib/utils.ts`
- Tests
  - Playwright E2E : `e2e/` + config `playwright.config.ts` → report dans `playwright-report/`
  - Vitest unit tests : `__tests__/`, config `vitest.config.ts`

## Installation & variables d'environnement
1. Installer dépendances :
```powershell
npm ci