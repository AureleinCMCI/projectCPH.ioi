# Diagrammes de séquence — CPH France IOI

Fichier contenant 3 diagrammes de séquence haut‑niveau pour les cas d'utilisation critiques : connexion, validation du panier (checkout) et réception via scanner. Coller le contenu dans un visualiseur Mermaid (mermaid.live ou extension VSCode) pour exporter en PNG/SVG.

## 1) Connexion (Login)
```mermaid
sequenceDiagram
  participant User as Utilisateur
  participant Front as Frontend (Next.js)
  participant API as /api/login (Next.js)
  participant SupabaseAuth as Supabase Auth

  User->>Front: Soumet form (email/password)
  Front->>API: POST /api/login {email, password}
  API->>SupabaseAuth: verify credentials (service role)
  SupabaseAuth-->>API: user record + jwt (ou erreur)
  alt auth OK
    API-->>Front: 200 { token, user }
    Front->>Front: stocke token, setUser
    Front->>API: GET /api/account (auth)
    API->>SupabaseAuth: validate token / fetch user
    SupabaseAuth-->>API: user data
    API-->>Front: user data
  else auth KO
    API-->>Front: 401 { error }
    Front->>User: affiche erreur
  end
```

## 2) Checkout (panier → commande, transaction atomique)
```mermaid
sequenceDiagram
  participant User as Utilisateur
  participant Front as Frontend (Panier)
  participant API as /api/commande (Next.js)
  participant DB as Supabase (Postgres RPC / transaction)

  User->>Front: Clique "Valider panier"
  Front->>API: POST /api/commande { transaction_id, user_id, lignes[] }
  API->>DB: CALL rpc_checkout_cart_or_create_order(payload)
  alt stocks suffisants
    DB-->>API: { success: true, commande_id, details }
    API-->>Front: 200 { success, commande_id }
    Front->>User: affiche confirmation, vide panier
  else stock insuffisant / erreur
    DB-->>API: { success: false, reason }
    API-->>Front: 409 { error: reason }
    Front->>User: affiche erreur (rafraîchir inventaire)
  end

  note right of DB: La RPC doit vérifier disponibilité,\nUPDATE inventaire atomique, INSERT commande + lignes, rollback si échec.
```

## 3) Réception via scanner (scan ISBN → lookup → create reception)
```mermaid
sequenceDiagram
  participant Staff as Employé
  participant Front as Frontend (ScannerResception)
  participant API_books as /api/inventaire (lookup)
  participant API_recv as /api/reception (create)
  participant DB as Supabase (RPC create_reception_transactional)

  Staff->>Front: Scan code‑barres (ISBN)
  Front->>Front: validate ISBN (10/13), debounce
  Front->>API_books: GET /api/inventaire?isbn=978...
  API_books->>DB: query livre + inventaire
  DB-->>API_books: livre + inventaire (ou null)
  API_books-->>Front: livre & inventaire
  alt livre trouvé
    Front->>Staff: ouvre formulaire Réception prérempli
    Staff->>Front: soumet {livre_id, inventaire_id?, quantite, note}
    Front->>API_recv: POST /api/reception {payload}
    API_recv->>DB: rpc create_reception_transactional(payload)
    alt success
      DB-->>API_recv: { success:true, inventaire_id, new_quantite, reception_id }
      API_recv-->>Front: 200 {success, new_quantite, reception_id}
      Front->>Staff: affiche succès + nouveau stock
    else error
      DB-->>API_recv: { success:false, reason }
      API_recv-->>Front: 400/500 { error }
      Front->>Staff: affiche erreur
    end
  else livre non trouvé
    Front->>Staff: propose créer nouvelle fiche livre / réception manuelle
  end
```