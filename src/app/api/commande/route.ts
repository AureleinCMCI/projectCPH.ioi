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

/* delete Quantité inventaire */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { livre_id, quantite , user_id , vendeur , title, prix_final} = await request.json();

    const { data, error } = await supabase.from('commande').insert([{ 
      livre_id, 
      quantite, 
      user_id, 
      vendeur, 
      title,
      price: prix_final // Le prix avec réduction devient le prix de vente
    }]).select();

    return new Response(
      JSON.stringify({ message: 'Quantité mise à jour', produit: data, success: true }),
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