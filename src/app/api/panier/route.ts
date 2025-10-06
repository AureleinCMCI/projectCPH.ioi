import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

// GET /api/panier?user_id=...
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id requis' }), { status: 400 });
    }

    // Récupérer le panier actif de l'utilisateur
    const { data: panier, error: panierError } = await supabase
      .from('panier')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .maybeSingle();

    if (panierError) {
      return new Response(JSON.stringify({ error: panierError.message }), { status: 400 });
    }

    if (!panier) {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }

    // Lister les items avec infos livre
    const { data: items, error: itemsError } = await supabase
      .from('panier_item')
      .select('id, quantity, added_at, livre:livre_id(id, isbn, author, title)')
      .eq('panier_id', panier.id)
      .order('added_at', { ascending: false });

    if (itemsError) {
      return new Response(JSON.stringify({ error: itemsError.message }), { status: 400 });
    }

    // Récupérer les prix depuis inventaire (price est dans inventaire)
    const livreIds = (items || [])
      .map((it: any) => it?.livre?.id)
      .filter((v: unknown): v is number => typeof v === 'number');

    let itemsWithPrice = items || [];

    if (livreIds.length > 0) {
      const uniqueIds = Array.from(new Set(livreIds));
      const { data: invRows, error: invErr } = await supabase
        .from('inventaire')
        .select('livre_id, price')
        .in('livre_id', uniqueIds);

      if (!invErr && invRows) {
        const priceByLivreId = new Map(invRows.map((r: any) => [r.livre_id, r.price]));
        itemsWithPrice = (items || []).map((it: any) => ({
          ...it,
          inventaire: { price: priceByLivreId.get(it?.livre?.id) ?? null },
        }));
      }
    }

    return new Response(JSON.stringify({ data: itemsWithPrice }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: message }), { status: 500 });
  }
}
//delete supprimé du panier //
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get('item_id');
    if (!item_id) {
      return new Response(JSON.stringify({ error: 'item_id requis' }), { status: 400 });
    } 
    const { data, error } = await supabase
      .from('panier_item')
      .delete()
      .eq('id', item_id)
      .select()
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: message }), { status: 500 });
  }
}
// POST /api/panier  { user_id, livre_id, quantity }
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { user_id, livre_id, quantity } = body as { user_id?: string; livre_id?: number; quantity?: number };

    if (!user_id || !livre_id || !quantity || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'Champs requis: user_id, livre_id, quantity>0' }), { status: 400 });
    }

    // Obtenir ou créer le panier actif
    let panierId: string | null = null;

    // Essayer de récupérer un panier actif
    const { data: existingPanier, error: existingErr } = await supabase
      .from('panier')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingErr) {
      return new Response(JSON.stringify({ error: existingErr.message }), { status: 400 });
    }

    if (existingPanier?.id) {
      panierId = existingPanier.id;
    } else {
      // Créer le panier actif
      const { data: created, error: createErr } = await supabase
        .from('panier')
        .insert([{ user_id, status: 'active' }])
        .select('id')
        .maybeSingle();

      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), { status: 400 });
      }
      panierId = created?.id ?? null;
    }

    if (!panierId) {
      return new Response(JSON.stringify({ error: 'Impossible de déterminer panier_id' }), { status: 500 });
    }

    // Upsert de la ligne (panier_id, livre_id) -> quantity +=
    const { data: upserted, error: upsertErr } = await supabase
      .from('panier_item')
      .upsert({ panier_id: panierId, livre_id, quantity }, { onConflict: 'panier_id,livre_id' })
      .select('id, quantity, livre_id')
      .maybeSingle();

    if (upsertErr) {
      // Si le upsert ne cumule pas, fallback: lire existant puis update quantity
      const { data: existingItem, error: fetchErr } = await supabase
        .from('panier_item')
        .select('id, quantity')
        .eq('panier_id', panierId)
        .eq('livre_id', livre_id)
        .maybeSingle();

      if (fetchErr) {
        return new Response(JSON.stringify({ error: upsertErr.message }), { status: 400 });
      }

      if (existingItem?.id) {
        const { data: updated, error: updateErr } = await supabase
          .from('panier_item')
          .update({ quantity: (existingItem.quantity || 0) + quantity })
          .eq('id', existingItem.id)
          .select('id, quantity, livre_id')
          .maybeSingle();

        if (updateErr) {
          return new Response(JSON.stringify({ error: updateErr.message }), { status: 400 });
        }
        return new Response(JSON.stringify({ data: updated, success: true }), { status: 200 });
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('panier_item')
          .insert([{ panier_id: panierId, livre_id, quantity }])
          .select('id, quantity, livre_id')
          .maybeSingle();

        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), { status: 400 });
        }
        return new Response(JSON.stringify({ data: inserted, success: true }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ data: upserted, success: true }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: message }), { status: 500 });
  }
}


