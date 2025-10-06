-- Migration SQL pour ajouter les champs de transaction à la table commande
-- À exécuter dans Supabase SQL Editor ou votre interface de base de données

-- Ajouter les nouveaux champs de transaction
ALTER TABLE commande 
ADD COLUMN transaction_id VARCHAR(255),
ADD COLUMN prix_original_unitaire DECIMAL(10,2),
ADD COLUMN reduction_appliquee DECIMAL(10,2),
ADD COLUMN type_reduction VARCHAR(20),
ADD COLUMN valeur_reduction DECIMAL(10,2),
ADD COLUMN total_transaction_original DECIMAL(10,2),
ADD COLUMN total_transaction_final DECIMAL(10,2);

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN commande.transaction_id IS 'Identifiant unique de la transaction (format: TXN_timestamp_userid_type)';
COMMENT ON COLUMN commande.prix_original_unitaire IS 'Prix unitaire du livre avant application de la réduction';
COMMENT ON COLUMN commande.reduction_appliquee IS 'Montant de réduction appliqué à ce livre spécifique';
COMMENT ON COLUMN commande.type_reduction IS 'Type de réduction appliquée: euros ou pourcentage';
COMMENT ON COLUMN commande.valeur_reduction IS 'Valeur de la réduction (montant en euros ou pourcentage)';
COMMENT ON COLUMN commande.total_transaction_original IS 'Prix total de la transaction avant réduction';
COMMENT ON COLUMN commande.total_transaction_final IS 'Prix total de la transaction après réduction';

-- Optionnel: Créer un index sur transaction_id pour améliorer les performances des requêtes
CREATE INDEX idx_commande_transaction_id ON commande(transaction_id);

-- Optionnel: Ajouter une contrainte pour s'assurer que type_reduction n'accepte que certaines valeurs
ALTER TABLE commande 
ADD CONSTRAINT chk_type_reduction 
CHECK (type_reduction IS NULL OR type_reduction IN ('euros', 'pourcentage'));

-- Vérifier la structure de la table après migration
-- (à exécuter pour confirmer que tout s'est bien passé)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'commande' 
ORDER BY ordinal_position;