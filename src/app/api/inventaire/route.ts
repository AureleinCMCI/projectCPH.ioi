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
          .select('*, livre(id, image)')
          .eq('livre_id', livreId)
          .maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json({ data, found: !!data });
      }
      if (lookupIsbn) {
        const { data, error } = await supabase
          .from('inventaire')
          .select('*, livre(id, image)')
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
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createClient();
  // Run two requests in parallel:
  // - one to fetch the requested page (with the join to `livre`)
  // - one lightweight HEAD/count-only request on the base table to get an exact total
  // This avoids doing a heavy COUNT(*) with joins which can time out on large datasets.
  // Fetch inventaire rows only (no join) - order by id for stable pagination
  const dataPromise = supabase
    .from('inventaire')
    .select('*')
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

  // Fetch related livre images for only the small set of livre_ids returned in this page.
  try {
    const livreIds = Array.from(new Set(data.map((row: InventaireWithLivre) => row.livre_id).filter(Boolean)));
    if (livreIds.length > 0) {
      const { data: livresData, error: livresError } = await supabase
        .from('livre')
        .select('id, image')
        .in('id', livreIds);

      if (!livresError && Array.isArray(livresData)) {
        const imageMap = new Map<number, LivreData>();
        for (const l of livresData) imageMap.set(l.id, l);
        // attach livre object with image to each inventaire row
        data = data.map((row: InventaireWithLivre) => ({ 
          ...row, 
          livre: imageMap.get(row.livre_id) ?? null 
        }));
      } else if (livresError) {
        console.warn('Could not fetch livre images for page:', livresError.message);
      }
    }
  } catch (mergeErr) {
    console.warn('Error merging livre images:', mergeErr);
  }

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
    const { action, livre_id, quantite_reservee, date_expiration_reservation } = await request.json();

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
