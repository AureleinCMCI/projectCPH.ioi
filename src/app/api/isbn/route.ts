import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';





/* recupére les isbn selon livre id */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  
  try {
    // Récupérer le livre_id depuis les paramètres de requête
    const { searchParams } = new URL(request.url);
    const livre_id = searchParams.get('livre_id');
    
    let query = supabase.from('isbn').select('*');
    
    // Si livre_id = 'all', récupérer tous les ISBN
    // Sinon, filtrer par livre_id spécifique
    if (livre_id && livre_id !== 'all') {
      query = query.eq('livre_id', livre_id);
    }
    
    const { data, error } = await query;
      
    if (error) {
      return Response.json({ error: "Erreur lors de la récupération des ISBN" }, { status: 400 });
    }
    
    console.log(`📚 ISBN récupérés pour livre_id ${livre_id}:`, data);
    return Response.json({ data });
  } catch (error) {
    console.error('Erreur API ISBN:', error);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
} 

export async function POST(request: NextRequest) {
    const supabase = createClient();  
    const { isbn, livre_id } = await request.json();
  
    // Vérifie d'abord si cet ISBN existe déjà pour ce livre
    const { data: existingIsbn } = await supabase
      .from('isbn')
      .select('*')
      .eq('isbn', isbn)
      .eq('livre_id', livre_id)
      .single();

    // Si l'ISBN n'existe pas encore pour ce livre, on l'ajoute
    if (!existingIsbn) {
      const { data, error } = await supabase
        .from('isbn')
        .insert([{ 
          isbn: isbn,
          livre_id: livre_id
        }]);
      
      if (error) {
        return Response.json({ error: "Erreur lors de l'ajout de l'ISBN alternatif" }, { status: 400 });
      }
      return Response.json({ message: "Nouvel ISBN ajouté avec succès", data });
    }

    return Response.json({ message: "Cet ISBN existe déjà pour ce livre" });
}