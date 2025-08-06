import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

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