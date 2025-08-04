import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

// Exemple de typage pour une ligne de la table "inventaire"
type Inventaire = {
  id?: number; // id généré par la BDD
  author: string;
  title: string;
  quantite: number;
  price: number;
  isbn: number;
};
// affiche les infos 

export async function GET() {
  const supabase = createClient();

  // Jointure sur livre_id pour récupérer l'image
  const { data, error } = await supabase
    .from('inventaire')
    .select('*, livre(id, image)')

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ data });
}



// insert dans inventaire
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { author, title, quantite, price , isbn} = await request.json() as Inventaire;

    // Insertion d'une nouvelle commande
    const { data, error } = await supabase.from('inventaire').insert([{ title, author, quantite, price , isbn }]).select().maybeSingle();



    console.log("Résultat Supabase :", data, error);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({ message: 'ajout réussie', user: data, success: true }),
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Erreur serveur :", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err instanceof Error ? err.message : 'Erreur inconnue' }),
      { status: 500 }
    );
  }
}
