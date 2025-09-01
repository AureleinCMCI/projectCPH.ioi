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
  quantite_reservee?: number;
  date_expiration_reservation?: string;
  date_de_production?: string;
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
    const { author, title, quantite, price, isbn, date_de_production} = await request.json() as Inventaire;

    // Insertion d'une nouvelle commande
    const { data, error } = await supabase.from('inventaire').insert([{ title, author, quantite, price, isbn, date_de_production }]).select().maybeSingle();



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

// Gestion des réservations
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { action, livre_id, quantite_reservee, date_expiration_reservation, user_id } = await request.json();

    if (action === 'reserver') {
      // Vérifier que le livre existe et a assez de stock disponible
      const { data: livre, error: livreError } = await supabase
        .from('inventaire')
        .select('quantite, quantite_reservee, title')
        .eq('livre_id', livre_id)
        .single();

      if (livreError || !livre) {
        return new Response(JSON.stringify({ error: 'Livre non trouvé' }), { status: 404 });
      }

      const quantiteDisponible = livre.quantite - (livre.quantite_reservee || 0);
      if (quantite_reservee > quantiteDisponible) {
        return new Response(
          JSON.stringify({ error: `Stock insuffisant. Disponible: ${quantiteDisponible}` }),
          { status: 400 }
        );
      }

      // Mettre à jour la quantité réservée
      const nouvelleQuantiteReservee = (livre.quantite_reservee || 0) + quantite_reservee;
      
      const { data, error } = await supabase
        .from('inventaire')
        .update({
          quantite_reservee: nouvelleQuantiteReservee,
          date_expiration_reservation: date_expiration_reservation
        })
        .eq('livre_id', livre_id)
        .select();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
      }

      return new Response(
        JSON.stringify({ 
          message: `${quantite_reservee} exemplaires de "${livre.title}" réservés avec succès`,
          data 
        }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: 'Action non reconnue' }), { status: 400 });

  } catch (err: unknown) {
    console.error("Erreur serveur :", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err instanceof Error ? err.message : 'Erreur inconnue' }),
      { status: 500 }
    );
  }
}
