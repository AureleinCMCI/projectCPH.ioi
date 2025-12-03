# 📚 Documentation API - Projet CPH France

## Table des matières
1. [Authentification](#authentification)
2. [Comptes utilisateurs](#comptes-utilisateurs)
3. [Livres](#livres)
4. [ISBN](#isbn)
5. [Inventaire](#inventaire)
6. [Commandes/Ventes](#commandesventes)
7. [Panier](#panier)
8. [Réservations](#réservations)
9. [Réception de stock](#réception-de-stock)
10. [Historique des réceptions](#historique-des-réceptions)

---

## Authentification

### POST /api/login
**Description:** Connexion d'un utilisateur

**Input (JSON):**
```json
{
  "name": "string",
  "password": "string"
}
```

**Output (JSON):**
```json
{
  "message": "Connexion réussie !",
  "user": {
    "id": 1,
    "name": "string",
    "photo": "string | null",
    "admin": boolean
  },
  "token": "string (JWT)",
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `401`: Nom ou mot de passe incorrect
- `400`: Erreur de validation
- `500`: Erreur serveur

### POST /api/signup
**Description:** Inscription d'un nouvel utilisateur

**Input (JSON):**
```json
{
  "name": "string",
  "password": "string",
  "photo": "string | null"
}
```

**Output (JSON):**
```json
{
  "message": "Inscription réussie !",
  "user": {
    "id": 1,
    "name": "string",
    "photo": "string | null",
    "admin": boolean
  },
  "success": true
}
```

**Codes de réponse:**
- `201`: Succès
- `409`: Nom déjà existant
- `400`: Erreur de validation
- `500`: Erreur serveur

### PUT /api/signup
**Description:** Mettre à jour le mot de passe d'un utilisateur

**Input (JSON):**
```json
{
  "name": "string",
  "password": "string (min 6 caractères)"
}
```

**Output (JSON):**
```json
{
  "message": "Mot de passe mis à jour pour {name}",
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `404`: Utilisateur non trouvé
- `400`: Erreur de validation
- `500`: Erreur serveur

---

## Comptes utilisateurs

### GET /api/account
**Description:** Récupérer les informations d'un compte utilisateur

**Input (Query Parameters):**
```
?id=1
```

**Output (JSON):**
```json
{
  "data": {
    "id": 1,
    "name": "string",
    "photo": "string | null",
    "admin": boolean
  },
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `404`: Utilisateur non trouvé
- `400`: Erreur de requête
- `500`: Erreur serveur

---

## Livres

### GET /api/livre
**Description:** Rechercher un livre par ISBN

**Input (Query Parameters):**
```
?isbn=1234567890
```

**Output (JSON):**
```json
{
  "data": {
    "id": 1,
    "isbn": 1234567890,
    "title": "string",
    "author": "string",
    "description": "string | null",
    "price": 10.50,
    "image": "string | null",
    "date_de_production": "YYYY-MM"
  }
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Erreur de requête

### POST /api/livre
**Description:** Créer un nouveau livre

**Input (JSON):**
```json
{
  "title": "string",
  "author": "string",
  "description": "string | null",
  "price": 10.50,
  "image": "string | null",
  "date_de_production": "YYYY-MM"
}
```

**Output (JSON):**
```json
{
  "message": "ajout réussie",
  "user": {
    "id": 1,
    "isbn": 1234567890,
    "title": "string",
    "author": "string",
    "description": "string | null",
    "price": 10.50,
    "image": "string | null",
    "date_de_production": "YYYY-MM"
  },
  "success": true
}
```

**Codes de réponse:**
- `201`: Succès
- `400`: Erreur de validation (date doit être YYYY-MM)
- `500`: Erreur serveur

### PATCH /api/livre
**Description:** Mettre à jour uniquement l'image d'un livre

**Input (JSON):**
```json
{
  "id": 1,
  "image": "string"
}
```

**Output (JSON):**
```json
{
  "message": "Image mise à jour",
  "livre": {
    "id": 1,
    "image": "string"
  },
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Erreur de requête
- `500`: Erreur serveur

---

## ISBN

### GET /api/isbn
**Description:** Récupérer les ISBN d'un livre

**Input (Query Parameters):**
```
?livre_id=1
ou
?livre_id=all  // Récupère tous les ISBN
```

**Output (JSON):**
```json
{
  "data": [
    {
      "id": 1,
      "isbn": 1234567890,
      "livre_id": 1
    }
  ]
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Erreur de requête
- `500`: Erreur serveur

### POST /api/isbn
**Description:** Ajouter un ISBN alternatif à un livre

**Input (JSON):**
```json
{
  "isbn": 1234567890,
  "livre_id": 1
}
```

**Output (JSON):**
```json
{
  "message": "Nouvel ISBN ajouté avec succès",
  "data": {
    "id": 1,
    "isbn": 1234567890,
    "livre_id": 1
  }
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Erreur ou ISBN déjà existant
- `500`: Erreur serveur

---

## Inventaire

### GET /api/inventaire
**Description:** Récupérer la liste paginée de l'inventaire

**Input (Query Parameters):**
```
?page=1
ou
?livre_id=1
ou
?isbn=1234567890
```

**Output (JSON):**
```json
{
  "data": [
    {
      "id": 1,
      "livre_id": 1,
      "author": "string",
      "title": "string",
      "quantite": 10,
      "quantite_reservee": 2,
      "price": 15.50,
      "isbn": 1234567890,
      "date_de_production": "YYYY-MM",
      "date_expiration_reservation": "ISO string | null",
      "livre": {
        "id": 1,
        "image": "string | null"
      } | null
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 100
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Erreur de requête
- `500`: Erreur serveur

### POST /api/inventaire
**Description:** Ajouter un article à l'inventaire

**Input (JSON):**
```json
{
  "author": "string",
  "title": "string",
  "quantite": 10,
  "price": 15.50,
  "isbn": 1234567890,
  "date_de_production": "YYYY-MM"
}
```

**Output (JSON):**
```json
{
  "message": "ajout réussie",
  "user": {
    "id": 1,
    "livre_id": 1,
    "author": "string",
    "title": "string",
    "quantite": 10,
    "price": 15.50,
    "isbn": 1234567890,
    "date_de_production": "YYYY-MM"
  },
  "success": true
}
```

**Codes de réponse:**
- `201`: Succès
- `400`: Erreur de validation
- `500`: Erreur serveur

### PUT /api/inventaire
**Description:** Réserver un livre (bloquer la quantité)

**Input (JSON):**
```json
{
  "action": "reserver",
  "livre_id": 1,
  "quantite_reservee": 2,
  "date_expiration_reservation": "ISO string"
}
```

**Output (JSON):**
```json
{
  "message": "2 exemplaires de \"Titre du livre\" réservés avec succès",
  "data": {
    "id": 1,
    "quantite": 10,
    "quantite_reservee": 2
  }
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Stock insuffisant ou action non reconnue
- `404`: Livre non trouvé
- `500`: Erreur serveur

---

## Commandes/Ventes

### GET /api/commande
**Description:** Récupérer toutes les commandes/ventes

**Output (JSON):**
```json
{
  "data": [
    {
      "id": 1,
      "transaction_id": "uuid",
      "user_id": 1,
      "vendeur": "string",
      "title": "string, string, ...",
      "quantite": 3,
      "price": 10.50,
      "total_transaction_original": 30.00,
      "total_transaction_final": 25.00,
      "reduction_appliquee": 5.00,
      "type_reduction": "euros | pourcentage",
      "valeur_reduction": 5.00,
      "lignes_json": "[{...}]",
      "date_achat": "ISO string",
      "statut": "completed"
    }
  ]
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Erreur de requête

### POST /api/commande
**Description:** Créer une nouvelle commande/vente (transaction complète)

**Input (JSON):**
```json
{
  "transaction_id": "uuid",
  "user_id": 1,
  "vendeur": "string",
  "total_transaction_original": 100.00,
  "total_transaction_final": 85.00,
  "montant_reduction": 15.00,
  "type_reduction": "euros | pourcentage",
  "valeur_reduction": 15.00,
  "lignes": [
    {
      "livre_id": 1,
      "title": "string",
      "quantite": 2,
      "prix_unitaire_final": 10.00,
      "prix_ligne_final": 20.00,
      "reduction_appliquee": 0
    }
  ]
}
```

**Output (JSON):**
```json
{
  "success": true,
  "inserted": {
    "id": 1,
    "transaction_id": "uuid",
    "user_id": 1,
    "title": "string, string, ...",
    "quantite": 2,
    "price": 10.00,
    "date_achat": "ISO string",
    "statut": "completed"
  },
  "transaction_id": "uuid"
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Payload invalide (transaction_id, user_id et lignes requis)
- `500`: Erreur serveur

---

## Panier

### GET /api/panier
**Description:** Récupérer le panier d'un utilisateur

**Input (Query Parameters):**
```
?user_id=1
```

**Output (JSON):**
```json
{
  "data": [
    {
      "id": 1,
      "quantity": 2,
      "added_at": "ISO string",
      "livre": [
        {
          "id": 1,
          "isbn": 1234567890,
          "author": "string",
          "title": "string"
        }
      ],
      "inventaire": {
        "price": 15.50
      }
    }
  ]
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: user_id requis
- `500`: Erreur serveur

### POST /api/panier
**Description:** Ajouter un livre au panier (ou augmenter la quantité)

**Input (JSON):**
```json
{
  "user_id": 1,
  "livre_id": 1,
  "quantity": 2
}
```

**Output (JSON):**
```json
{
  "data": {
    "id": 1,
    "quantity": 2,
    "livre_id": 1
  },
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Champs requis manquants ou quantité <= 0
- `500`: Erreur serveur

### DELETE /api/panier
**Description:** Supprimer un item du panier

**Input (Query Parameters):**
```
?item_id=1
```

**Output (JSON):**
```json
{
  "data": {
    "id": 1,
    "quantity": 2
  }
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: item_id requis
- `500`: Erreur serveur

---

## Réservations

### GET /api/reservations
**Description:** Récupérer toutes les réservations

**Output (JSON):**
```json
{
  "data": [
    {
      "id": 1,
      "inventaire_id": 1,
      "quantite_bloquee": 2,
      "date_expiration": "ISO string",
      "date_creation": "ISO string",
      "name": "string | null",
      "telephone": "string | null",
      "user_id": 1,
      "inventaire": {
        "title": "string",
        "author": "string",
        "price": 15.50,
        "isbn": 1234567890
      },
      "USER": {
        "id": 1,
        "name": "string",
        "admin": boolean
      }
    }
  ]
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Erreur de requête

### POST /api/reservations
**Description:** Vendre une réservation (supprime sans remettre le stock)

**Input (JSON):**
```json
{
  "action": "vente",
  "id": 1,
  "user_id": 1
}
```

**Output (JSON):**
```json
{
  "message": "✅ Vente effectuée ! 2 exemplaires vendus",
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Action non supportée
- `404`: Réservation non trouvée
- `500`: Erreur serveur

### DELETE /api/reservations
**Description:** Annuler une réservation (remet le stock)

**Input (JSON):**
```json
{
  "id": 1,
  "user_id": 1
}
```

**Output (JSON):**
```json
{
  "message": "✅ Réservation annulée et 2 exemplaires remis en stock",
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Champs requis manquants
- `404`: Réservation non trouvée
- `500`: Erreur serveur

### PUT /api/reserverLivre
**Description:** Réserver des livres (décrémente l'inventaire et crée une réservation)

**Input (JSON):**
```json
{
  "id": 1,
  "quantite_a_bloquer": 2,
  "date_expiration": "ISO string",
  "name": "string | null",
  "telephone": "string | null"
}
```

**Output (JSON):**
```json
{
  "message": "✅ 2 exemplaires de \"Titre\" réservés jusqu'au {date}. Stock restant: 8",
  "blocage": {
    "id": 1,
    "inventaire_id": 1,
    "quantite_bloquee": 2,
    "date_expiration": "ISO string",
    "date_creation": "ISO string"
  },
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Stock insuffisant ou champs requis manquants
- `404`: Produit non trouvé
- `500`: Erreur serveur

---

## Réception de stock

### POST /api/ScannerResception
$\textbf{Description:** Ajouter de la quantité au stock d'un produit

**Input (JSON):**
```json
{
  "id": 1,
  "ajout": 10
}
```

**Output (JSON):**
```json
{
  "message": "Quantité mise à jour",
  "produit": {
    "id": 1,
    "quantite": 20,
    "date_de_production": "YYYY-MM"
  },
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `404`: Produit non trouvé
- `500`: Erreur serveur

### DELETE /api/ScannerResception
**Description:** Retirer de la quantité du stock d'un produit

**Input (JSON):**
```json
{
  "id": 1,
  "supprimer": 5
}
```

**Output (JSON):**
```json
{
  "message": "Quantité mise à jour",
  "produit": {
    "id": 1,
    "title": "string",
    "quantite": 15
  },
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Stock insuffisant
- `404`: Produit non trouvé
- `500`: Erreur serveur

### PATCH /api/ScannerResception
**Description:** Mettre à jour l'ISBN d'un produit

**Input (JSON):**
```json
{
  "id": 1,
  "livre_id": 1,
  "newIsbn": 9876543210,
  "oldIsbn": 1234567890
}
```

**Output (JSON):**
```json
{
  "message": "ISBN mis à jour dans toutes les tables",
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Champs requis manquants
- `500`: Erreur serveur

---

## Historique des réceptions

### GET /api/historiqueResception
**Description:** Récupérer l'historique de toutes les réceptions

**Output (JSON):**
```json
{
  "message": "historique réception",
  "user": [
    {
      "id": 1,
      "user_id": 1,
      "date_reception": 1234567890,
      "quantite": 50,
      "livre_id": 1,
      "info": 1,
      "livre_title": "string",
      "date_de_production": "YYYY-MM",
      "name_user": "string"
    }
  ],
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Erreur de requête

### POST /api/historiqueResception
**Description:** Ajouter une entrée dans l'historique des réceptions

**Input (JSON):**
```json
{
  "quantite": 50,
  "name_user": "string",
  "livre_id": 1,
  "info": 1,
  "user_id": 1,
  "livre_title": "string",
  "date_de_production": "YYYY-MM"
}
```

**Output (JSON):**
```json
{
  "message": "Réception ajoutée",
  "user": {
    "id": 1,
    "user_id": 1,
    "date_reception": 1234567890,
    "quantite": 50,
    "livre_id": 1,
    "info": 1
  },
  "success": true
}
```

**Codes de réponse:**
- `200`: Succès
- `400`: Champs manquants
- `500`: Erreur serveur

---

## Notes importantes

### Variables d'environnement requises:
- `NEXT_P gauche configuration pour utiliser les appels API directement dans vos interfaces TypeScript, voici un guide rapide.
