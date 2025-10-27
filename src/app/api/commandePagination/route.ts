import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

// Exemple de typage pour une ligne de la table "inventaire"
type Inventaire = {
  id?: number; // id généré par la BDD
  livre_id: number; // référence vers la table livre
  author: string;
  title: string;
  quantite: number;
  price: number;
  isbn: number;
  quantite_reservee?: number;
  date_expiration_reservation?: string;
  date_de_production?: string;
};

// Type pour les données d'inventaire avec livre joint
type InventaireWithLivre = Inventaire & {
  livre?: {
    id: number;
    image?: string;
  } | null;
};

// Type pour les données de livre
type LivreData = {
  id: number;
  image?: string;
}; 

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Quick lookup support: if client asks for a specific livre_id or isbn, return that row (no pagination)
  const lookupLivreId = url.searchParams.get('livre_id');
  const lookupIsbn = url.searchParams.get('isbn');
  if (lookupLivreId || lookupIsbn) {
    const supabase = createClient();
    try {
      if (lookupLivreId) {
        const livreId = Number(lookupLivreId);
        const { data, error } = await supabase
          .from('inventaire')
          .select('id, livre_id, author, title , quantite, price, isbn ,livre (image)')
          .eq('livre_id', livreId)
          .maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json({ data, found: !!data });
      }
      if (lookupIsbn) {
        const { data, error } = await supabase
          .from('inventaire')
          .select('id, livre_id, author, title , quantite, price, isbn ,livre (image)')
          .eq('isbn', lookupIsbn)
          .maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json({ data, found: !!data });
      }
    } catch (err: unknown) {
      console.error('Lookup error:', err);
      return Response.json({ error: 'Lookup failed' }, { status: 500 });
    }
  }
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createClient();
  // Run two requests in parallel:
  // - one to fetch the requested page with only selected fields (no images)
  // - one lightweight HEAD/count-only request on the base table to get an exact total
  const dataPromise = supabase
    .from('inventaire')
    .select('id, livre_id, author, title, quantite, price, isbn ,livre (image)')
    .order('id', { ascending: true })
    .range(from, to);

  const countPromise = supabase
    .from('inventaire')
    .select('id', { count: 'exact', head: true });

  const [dataRes, countRes] = await Promise.allSettled([dataPromise, countPromise]);

  let data: InventaireWithLivre[] = [];
  let total: number | null = null;

  if (dataRes.status === 'fulfilled') {
    if (dataRes.value.error) {
      console.error('Supabase data error:', dataRes.value.error);
      return Response.json({ error: dataRes.value.error.message }, { status: 400 });
    }
    data = (dataRes.value.data ?? []) as InventaireWithLivre[];
  } else {
    console.error('Error fetching page data:', dataRes.reason);
    return Response.json({ error: String(dataRes.reason) }, { status: 500 });
  }

  // No separate query for images here, only minimal fields are sent

  if (countRes.status === 'fulfilled') {
    if (!countRes.value.error && typeof countRes.value.count === 'number') {
      total = Number(countRes.value.count);
    }
  } else {
    console.warn('Count request failed or timed out, continuing without total:', countRes.reason);
    total = null;
  }

  return Response.json({ data, page, pageSize, total });
}
