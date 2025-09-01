import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

// GET - Récupérer les réservations d'un utilisateur
export async function GET() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        inventaire (
          title,
          author,
          price,
          isbn
        ),
        "USER":user_id (
          id,
          name,
          admin
        )
      `);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  }
  

// DELETE - Annuler une réservation
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { id, user_id } = await request.json();

    if (!id || !user_id) {
      return new Response(JSON.stringify({ error: "id et user_id requis" }), { status: 400 });
    }

    // Récupérer les détails de la réservation avant suppression
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('inventaire_id, quantite_bloquee')
      .eq('id', id)
      .eq('user_id', user_id) // Sécurité : seul l'utilisateur peut annuler sa réservation
      .single();

    if (fetchError || !reservation) {
      return new Response(JSON.stringify({ error: "Réservation non trouvée" }), { status: 404 });
    }

    // Supprimer la réservation
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 400 });
    }

    // Récupérer la quantité actuelle et l'augmenter
    const { data: inventaireItem, error: fetchInventaireError } = await supabase
      .from('inventaire')
      .select('quantite')
      .eq('id', reservation.inventaire_id)
      .single();

    if (!fetchInventaireError && inventaireItem) {
      // Remettre la quantité dans l'inventaire
      const { error: updateError } = await supabase
        .from('inventaire')
        .update({ 
          quantite: inventaireItem.quantite + reservation.quantite_bloquee
        })
        .eq('id', reservation.inventaire_id);

      if (updateError) {
        console.error('Erreur lors de la remise en stock:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `✅ Réservation annulée et ${reservation.quantite_bloquee} exemplaires remis en stock`,
        success: true 
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Erreur:', err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err }),
      { status: 500 }
    );
  }
}
