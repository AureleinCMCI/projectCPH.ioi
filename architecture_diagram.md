# Diagramme d'Architecture - Application CPH France IOI

## Vue d'ensemble de l'Architecture

Ce diagramme illustre l'architecture complète de l'application de gestion de librairie CPH France IOI, montrant les interactions entre les composants frontend, backend, base de données et services externes.

```mermaid
graph TB
    %% Couche Présentation (Frontend)
    subgraph "Frontend - Next.js 15"
        UI[Interface Utilisateur]
        COMP[Composants React]
        PAGES[Pages Next.js]
        STYLES[Styles CSS Modules]
    end

    %% Couche API (Backend)
    subgraph "Backend - Next.js API Routes"
        AUTH[API Authentication<br/>/api/login, /api/signup]
        BOOKS[API Livres<br/>/api/livre]
        INVENTORY[API Inventaire<br/>/api/inventaire]
        ORDERS[API Commandes<br/>/api/commande]
        RESERVATIONS[API Réservations<br/>/api/reservations]
        SCANNER[API Scanner<br/>/api/ScannerResception]
        ACCOUNT[API Compte<br/>/api/account]
    end

    %% Couche Base de Données
    subgraph "Base de Données - Supabase PostgreSQL"
        USER_TABLE[Table USER<br/>- id, name, password<br/>- photo, admin]
        LIVRE_TABLE[Table livre<br/>- id, title, author<br/>- description, price, isbn]
        INVENTAIRE_TABLE[Table inventaire<br/>- id, quantite, price<br/>- quantite_reservee]
        COMMANDE_TABLE[Table commande<br/>- id, quantite, vendeur<br/>- created_at]
        RESERVATION_TABLE[Table reservations<br/>- id, quantite_bloquee<br/>- date_expiration]
        RECEPTION_TABLE[Table reception<br/>- id, quantite<br/>- date_reception]
        ISBN_TABLE[Table isbn<br/>- id, isbn, livre_id]
    end

    %% Services Externes
    subgraph "Services Externes"
        SUPABASE[Supabase<br/>- Base de données<br/>- Authentification<br/>- Stockage fichiers]
        JWT[JWT Tokens<br/>- Authentification<br/>- Sessions utilisateur]
        BCRYPT[BCrypt<br/>- Hashage mots de passe]
        QR_SCANNER[QR Code Scanner<br/>- Lecture codes-barres<br/>- ISBN]
    end

    %% Couche Client
    subgraph "Client (Navigateur Mobile/Desktop)"
        BROWSER[Navigateur Web]
        LOCAL_STORAGE[Local Storage<br/>- JWT Token<br/>- Données utilisateur]
    end

    %% Flux de données
    BROWSER --> UI
    UI --> COMP
    COMP --> PAGES
    PAGES --> AUTH
    PAGES --> BOOKS
    PAGES --> INVENTORY
    PAGES --> ORDERS
    PAGES --> RESERVATIONS
    PAGES --> SCANNER
    PAGES --> ACCOUNT

    %% API vers Base de données
    AUTH --> USER_TABLE
    AUTH --> JWT
    AUTH --> BCRYPT
    BOOKS --> LIVRE_TABLE
    BOOKS --> ISBN_TABLE
    INVENTORY --> INVENTAIRE_TABLE
    INVENTORY --> LIVRE_TABLE
    ORDERS --> COMMANDE_TABLE
    ORDERS --> LIVRE_TABLE
    RESERVATIONS --> RESERVATION_TABLE
    RESERVATIONS --> INVENTAIRE_TABLE
    SCANNER --> RECEPTION_TABLE
    SCANNER --> LIVRE_TABLE
    ACCOUNT --> USER_TABLE

    %% Services externes
    AUTH --> SUPABASE
    BOOKS --> SUPABASE
    INVENTORY --> SUPABASE
    ORDERS --> SUPABASE
    RESERVATIONS --> SUPABASE
    SCANNER --> SUPABASE
    ACCOUNT --> SUPABASE

    %% Scanner QR
    SCANNER --> QR_SCANNER
    QR_SCANNER --> BOOKS

    %% Stockage local
    BROWSER --> LOCAL_STORAGE
    LOCAL_STORAGE --> AUTH

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef database fill:#e8f5e8
    classDef external fill:#fff3e0
    classDef client fill:#fce4ec

    class UI,COMP,PAGES,STYLES frontend
    class AUTH,BOOKS,INVENTORY,ORDERS,RESERVATIONS,SCANNER,ACCOUNT backend
    class USER_TABLE,LIVRE_TABLE,INVENTAIRE_TABLE,COMMANDE_TABLE,RESERVATION_TABLE,RECEPTION_TABLE,ISBN_TABLE database
    class SUPABASE,JWT,BCRYPT,QR_SCANNER external
    class BROWSER,LOCAL_STORAGE client
```

## Description des Composants

### 🎨 Frontend (Next.js 15)
- **Interface Utilisateur** : Interface responsive optimisée pour mobile
- **Composants React** : Composants réutilisables (LoginForm, Inventaire, Scanner, etc.)
- **Pages Next.js** : Pages de l'application (acceuil, inventaire, commande, etc.)
- **Styles CSS Modules** : Styling modulaire avec Mantine UI

### ⚙️ Backend (Next.js API Routes)
- **API Authentication** : Gestion des connexions et inscriptions
- **API Livres** : CRUD des livres, gestion ISBN
- **API Inventaire** : Gestion des stocks et quantités
- **API Commandes** : Historique des ventes
- **API Réservations** : Gestion des réservations clients
- **API Scanner** : Réception de livres via QR code
- **API Compte** : Gestion des profils utilisateurs

### 🗄️ Base de Données (Supabase PostgreSQL)
- **Table USER** : Utilisateurs et administrateurs
- **Table livre** : Catalogue principal des livres
- **Table inventaire** : Stocks physiques
- **Table commande** : Historique des ventes
- **Table reservations** : Réservations actives
- **Table reception** : Historique des réceptions
- **Table isbn** : Gestion des ISBN multiples

### 🔧 Services Externes
- **Supabase** : Base de données PostgreSQL hébergée
- **JWT** : Authentification par tokens
- **BCrypt** : Sécurisation des mots de passe
- **QR Scanner** : Lecture des codes-barres ISBN

## Flux de Données Principaux

### 1. Authentification
```
Client → API Login → Supabase → JWT Token → Local Storage
```

### 2. Gestion des Livres
```
Scanner QR → API Scanner → Supabase → Table reception → Table inventaire
```

### 3. Consultation Inventaire
```
Client → API Inventaire → Supabase → Tables inventaire/livre → Interface
```

### 4. Gestion des Commandes
```
Client → API Commandes → Supabase → Table commande → Confirmation
```

## Technologies Utilisées

- **Frontend** : Next.js 15, React 19, TypeScript, Mantine UI
- **Backend** : Next.js API Routes, Node.js
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : JWT, BCrypt
- **Scanner** : React QR Scanner, ZXing
- **Déploiement** : Vercel

## Sécurité

- Mots de passe hashés avec BCrypt
- Authentification JWT avec expiration (2h)
- Validation des données côté API
- Gestion des erreurs centralisée
- Protection des routes sensibles

## Scalabilité

- Architecture modulaire avec composants réutilisables
- API RESTful pour faciliter l'extension
- Base de données relationnelle normalisée
- Support mobile-first responsive
- Gestion d'état local optimisée
