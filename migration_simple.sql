-- Version simplifiée - Commandes SQL essentielles
-- Copie-colle ces commandes dans Supabase SQL Editor

ALTER TABLE commande 
ADD COLUMN transaction_id VARCHAR(255),
ADD COLUMN prix_original_unitaire DECIMAL(10,2),
ADD COLUMN reduction_appliquee DECIMAL(10,2),
ADD COLUMN type_reduction VARCHAR(20),
ADD COLUMN valeur_reduction DECIMAL(10,2),
ADD COLUMN total_transaction_original DECIMAL(10,2),
ADD COLUMN total_transaction_final DECIMAL(10,2);

-- Index pour améliorer les performances
CREATE INDEX idx_commande_transaction_id ON commande(transaction_id);