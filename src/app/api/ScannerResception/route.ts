import { createClient } from '@/lib/supabase/clients';
import { NextRequest, NextResponse } from 'next/server';

export type Reception = {
  id?: number;
  user_id: number;
  date_reception: number;
  quantite: number;
  livre_id: number;
  info: number;
  livre_title: string;
  date_de_production?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const {
      id,
      ajout,
      quantite,
      date_de_production,
      author,
      title,
      price,
      isbn,
      name_user,
      livre_id,
      info,
      user_id,
      livre_title,
    } = body as Record<string, unknown>;

    // Appel RPC atomique
    const { data, error } = await supabase.rpc('reception_inventaire_atomique', {
      p_id: id ?? null,
      p_ajout: ajout ?? null,
      p_quantite: quantite ?? null,
      p_date_de_production: date_de_production ?? null,
      p_author: author ?? null,
      p_title: title ?? null,
      p_price: price ?? null,
      p_isbn: isbn ?? null,
      p_name_user: name_user ?? null,
      p_livre_id: livre_id ?? null,
      p_info: info ?? null,
      p_user_id: user_id ?? null,
      p_livre_title: livre_title ?? null,
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    // Vérifier si la fonction RPC a retourné une erreur métier
    if (data && data.error) {
      return new Response(JSON.stringify({ error: data.error }), { status: data.status || 400 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erreur API ScannerResception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest)
{
  try {
    const supabase = createClient();
    const {id, supprimer } = await request.json();

    // Récupérer les informations du produit
    const { data: produit, error: fetchError } = await supabase
      .from('inventaire')
      .select('quantite, title')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !produit) {
      return new Response(JSON.stringify({ error: "Produit non trouvé" }), { status: 404 });
    }

    // Vérifier qu'il y a assez de stock (simple vérification)
    if (supprimer > produit.quantite) {
      return new Response(
        JSON.stringify({ 
          error: `❌ Stock insuffisant ! Stock disponible: ${produit.quantite}, demandé: ${supprimer}` 
        }), 
        { status: 400 }
      );
    }

    // Calculer la nouvelle quantité
    const nouvelleQuantite = produit.quantite - supprimer;

    // Mettre à jour la quantité
    const { data, error } = await supabase
      .from('inventaire')
      .update({ quantite: nouvelleQuantite })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({ message: 'Quantité mise à jour', produit: data, success: true }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Erreur:', err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: err}),
      { status: 500 }
    );
  }
}

// Méthode pour réserver des livres (décrémenter + ajouter à blocages_inventaire)
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { id, quantite_a_bloquer, date_expiration, name, telephone } = await request.json();

    if (!id || !quantite_a_bloquer || !date_expiration) {
      return new Response(JSON.stringify({ error: "id, quantite_a_bloquer et date_expiration requis" }), { status: 400 });
    }

    // Récupérer les informations du produit
    const { data: produit, error: fetchError } = await supabase
      .from('inventaire')
      .select('quantite, title')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !produit) {
      return new Response(JSON.stringify({ error: "Produit non trouvé" }), { status: 404 });
    }

    // Vérifier qu'il y a assez de stock
    if (quantite_a_bloquer > produit.quantite) {
      return new Response(
        JSON.stringify({ 
          error: `❌ Stock insuffisant ! Stock disponible: ${produit.quantite}, demandé: ${quantite_a_bloquer}` 
        }), 
        { status: 400 }
      );
    }

    // 1. Décrémenter la quantité dans inventaire (comme une vente)
    const nouvelleQuantite = produit.quantite - quantite_a_bloquer;
    
    const { error: updateError } = await supabase
      .from('inventaire')
      .update({ quantite: nouvelleQuantite })
      .eq('id', id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400 });
    }

    // 2. Ajouter les livres réservés dans reservations
    const user_id = request.headers.get('user_id');
    
    const reservationData: {
      inventaire_id: number;
      quantite_bloquee: number;
      date_expiration: string;
      date_creation: string;
      name: string | null;
      telephone: string | null;
      user_id?: number;
    } = {
      inventaire_id: id,
      quantite_bloquee: quantite_a_bloquer,
      date_expiration: date_expiration,
      date_creation: new Date().toISOString(),
      name: name || null,
      telephone: telephone || null
    };

    // Ajouter user_id seulement s'il existe
    if (user_id) {
      reservationData.user_id = parseInt(user_id);
    }

    const { data: blocage, error: insertError } = await supabase
      .from('reservations')
      .insert([reservationData])
      .select()
      .single();

    if (insertError) {
      // Si l'insertion échoue, remettre la quantité originale
      await supabase
        .from('inventaire')
        .update({ quantite: produit.quantite })
        .eq('id', id);
        
      return new Response(JSON.stringify({ error: insertError.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({ 
        message: `✅ ${quantite_a_bloquer} exemplaires de "${produit.title}" réservés jusqu'au ${new Date(date_expiration).toLocaleDateString('fr-FR')}. Stock restant: ${nouvelleQuantite}`, 
        blocage: blocage, 
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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { id, livre_id, newIsbn, oldIsbn } = await request.json();

    if (!id || !livre_id || !newIsbn || !oldIsbn) {
      return new Response(JSON.stringify({ error: "id, livre_id, newIsbn et oldIsbn requis" }), { status: 400 });
    }

    // 1. Mettre à jour l'ISBN dans inventaire (clé primaire id)
    const { error: inventaireError } = await supabase
      .from('inventaire')
      .update({ isbn: newIsbn })
      .eq('id', id);

    if (inventaireError) {
      return new Response(JSON.stringify({ error: inventaireError.message }), { status: 400 });
    }

    // 2. Supprimer l'ancien ISBN dans la table isbn
    const { error: deleteIsbnError } = await supabase
      .from('isbn')
      .delete()
      .eq('livre_id', livre_id)
      .eq('isbn', oldIsbn);

    if (deleteIsbnError) {
      return new Response(JSON.stringify({ error: deleteIsbnError.message }), { status: 400 });
    }

    // 3. Insérer le nouveau ISBN dans la table isbn
    const { error: insertIsbnError } = await supabase
      .from('isbn')
      .insert([{ isbn: newIsbn, livre_id }]);

    if (insertIsbnError) {
      return new Response(JSON.stringify({ error: insertIsbnError.message }), { status: 400 });
    }

    // 4. (Optionnel) Mettre à jour l'ISBN principal dans livre
    await supabase
      .from('livre')
      .update({ isbn: newIsbn })
      .eq('id', livre_id);

    return new Response(
      JSON.stringify({ message: 'ISBN mis à jour dans toutes les tables', success: true }),
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

