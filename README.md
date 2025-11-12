<div align="center">

# 📚 CPH Project - Système de Gestion de Librairie

![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![Mantine](https://img.shields.io/badge/Mantine-8.1.1-339AF0?style=for-the-badge&logo=mantine)

**Une application moderne et complète pour la gestion d'inventaire de librairie avec scan de codes-barres multi-plateforme**

[Démo](#-démo) • [Fonctionnalités](#-fonctionnalités-principales) • [Installation](#-installation) • [Documentation](#-documentation)

---

</div>

## 📖 Table des Matières

- [À propos](#-à-propos-du-projet)
- [Fonctionnalités Principales](#-fonctionnalités-principales)
- [Technologies](#-technologies-utilisées)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#%EF%B8%8F-configuration)
- [Utilisation](#-utilisation)
- [Tests](#-tests)
- [Déploiement](#-déploiement)
- [Contribuer](#-contribuer)
- [Licence](#-licence)

---

## 🎯 À Propos du Projet

**CPH Project** est une application web full-stack de gestion de librairie développée avec Next.js 15 et React 19. Elle offre une solution complète pour gérer l'inventaire, les ventes, les réservations et les statistiques d'une librairie, avec un système de scan de codes-barres optimisé pour iOS, Android et Desktop.

### ✨ Points Forts

- 🚀 **Performance** : Next.js 15 avec React Server Components
- 📱 **Multi-plateforme** : Scanner de codes-barres fonctionnel sur iOS, Android et Desktop
- 🔐 **Sécurisé** : Authentification JWT + Supabase Row Level Security (RLS)
- 🎨 **UI Moderne** : Interface élégante avec Mantine UI et animations CSS
- 📊 **Analytics** : Tableaux de bord statistiques avec graphiques interactifs
- 🌐 **Offline-ready** : Gestion optimisée des données avec cache local

---

## 🚀 Fonctionnalités Principales

### 📦 Gestion d'Inventaire

- ✅ **Réception de livres** avec scan ISBN (multi-ISBN par livre)
- ✅ **Ajout/modification** de livres avec upload d'images (WebP + miniatures)
- ✅ **Gestion des stocks** en temps réel
- ✅ **Recherche avancée** par titre, auteur, ISBN
- ✅ **Pagination optimisée** (20 livres/page)
- ✅ **Historique des réceptions** avec traçabilité

### 🛒 Ventes et Commandes

- ✅ **Scan de codes-barres** pour vente rapide
- ✅ **Panier multi-livres** avec gestion quantités
- ✅ **Réductions** (€ ou %) sur total panier ou livre individuel
- ✅ **Validation des stocks** avant vente (inclut réservations)
- ✅ **Exports CSV** des commandes avec UTF-8 BOM
- ✅ **Transactions groupées** avec ID unique

### 📅 Réservations

- ✅ **Blocage de stock** temporaire avec date d'expiration
- ✅ **Informations clients** (nom, téléphone)
- ✅ **Alertes visuelles** pour réservations expirées/proches
- ✅ **Conversion réservation → vente** en un clic
- ✅ **Annulation** avec déblocage automatique du stock

### 📊 Statistiques (Admin)

- ✅ **Compteurs animés** : CA, ventes totales, réceptions, stock
- ✅ **Graphiques interactifs** (Recharts) : évolutions mensuelles, top ventes
- ✅ **Exports CSV** : ventes, réceptions, CA, inventaire complet
- ✅ **Filtres temporels** : jour, semaine, mois, année
- ✅ **Regroupement par transaction** pour analyses précises

### 📱 Scanner Multi-Plateforme

#### Android/Desktop
- **html5-qrcode** avec BarcodeDetector API natif
- 30 FPS, résolution 640x480
- Zoom, torche, sélection caméra
- Formats : EAN-13, EAN-8, Code 128

#### iOS
- **QuaggaJS** optimisé pour Safari
- Sélection automatique caméra arrière
- 4 workers parallèles
- Formats : EAN, Code 128, Code 39, Codabar

### 🔐 Authentification & Sécurité

- ✅ **JWT** avec localStorage
- ✅ **Rôles utilisateurs** (admin/user)
- ✅ **Middleware Supabase** pour protection routes
- ✅ **Hash bcrypt** pour mots de passe
- ✅ **Validation côté client & serveur**

---

## 🛠️ Technologies Utilisées

### Frontend

| Technologie | Version | Utilisation |
|------------|---------|-------------|
| **Next.js** | 15.3.3 | Framework React avec SSR/SSG |
| **React** | 19.0.0 | Bibliothèque UI |
| **TypeScript** | 5.9.3 | Typage statique |
| **Mantine UI** | 8.1.1 | Composants UI modernes |
| **Tabler Icons** | 3.34.0 | Icônes SVG |
| **Recharts** | 3.1.2 | Graphiques statistiques |

### Scanner & Codes-Barres

| Bibliothèque | Plateforme | Formats |
|-------------|-----------|---------|
| **html5-qrcode** | Android/Desktop | EAN-13, EAN-8, Code 128 |
| **@ericblade/quagga2** | iOS | EAN, Code 128, Code 39, Codabar |
| **BarcodeDetector API** | Android (native) | Détection ultra-rapide |

### Backend & Base de Données

| Service | Utilisation |
|---------|------------|
| **Supabase** | PostgreSQL + Auth + Storage + RLS |
| **Next.js API Routes** | Endpoints REST |
| **JWT** | Authentification stateless |
| **Sharp** | Compression d'images (WebP) |

### Testing & DevOps

| Outil | Usage |
|-------|-------|
| **Playwright** | Tests E2E |
| **Vitest** | Tests unitaires |
| **ESLint** | Linting TypeScript/React |
| **Vercel** | Déploiement CI/CD |

---

## 🏗️ Architecture
