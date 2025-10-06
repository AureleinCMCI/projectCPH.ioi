import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';


export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from('commande').select('*');
  
    if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
  return new Response(JSON.stringify({ data }), { status:  200 }); 
  
} 

/* Ajouter une commande avec informations de transaction */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { 
      livre_id, 
      quantite, 
      user_id, 
      vendeur, 
      title, 
      prix_final,
      transactionInfo
    } = await request.json();

    // Préparer les données de base
    const commandeData: any = { 
      livre_id, 
      quantite, 
      user_id, 
      vendeur, 
      title,
      price: prix_final // Le prix avec réduction devient le prix de vente
    };

    // Ajouter les informations de transaction si présentes
    if (transactionInfo) {
      commandeData.transaction_id = transactionInfo.transaction_id;
      commandeData.prix_original_unitaire = transactionInfo.prix_original_unitaire;
      commandeData.reduction_appliquee = transactionInfo.reduction_appliquee;
      commandeData.type_reduction = transactionInfo.type_reduction;
      commandeData.valeur_reduction = transactionInfo.valeur_reduction;
      commandeData.total_transaction_original = transactionInfo.total_transaction_original;
      commandeData.total_transaction_final = transactionInfo.total_transaction_final;
    }

    const { data } = await supabase.from('commande').insert([commandeData]).select();

    return new Response(
      JSON.stringify({ 
        message: 'Commande ajoutée avec succès', 
        produit: data, 
        success: true,
        transactionInfo: transactionInfo || null
      }),
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: message }),
      { status: 500 }
    );
  }
}