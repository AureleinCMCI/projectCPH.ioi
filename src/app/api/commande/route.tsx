import { createClient } from '@/lib/supabase/clients';

type Ligne = {
  livre_id?: number;
  title?: string;
  quantite?: number;
  prix_unitaire_final?: number;
  prix_ligne_final?: number;
  reduction_appliquee?: number;
};

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from('commande').select('*');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ data }), { status: 200 });
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json()) as unknown;
    if (typeof raw !== 'object' || raw === null) {
      return new Response(JSON.stringify({ error: 'Payload invalide' }), { status: 400 });
    }

    const body = raw as {
      transaction_id?: string;
      user_id?: number | string;
      vendeur?: string;
      total_transaction_original?: number;
      total_transaction_final?: number;
      montant_reduction?: number;
      type_reduction?: string;
      valeur_reduction?: number;
      lignes?: unknown;
    };

    const {
      transaction_id,
      user_id,
      vendeur,
      total_transaction_original,
      total_transaction_final,
      montant_reduction,
      type_reduction,
      valeur_reduction,
    } = body;

    if (!transaction_id || !user_id || !Array.isArray(body.lignes) || body.lignes.length === 0) {
      return new Response(JSON.stringify({ error: 'transaction_id, user_id et lignes requis' }), { status: 400 });
    }

    // Normalize and validate lignes
    const lignes: Ligne[] = body.lignes.map((l) => {
      if (typeof l !== 'object' || l === null) return {};
      const item = l as Record<string, unknown>;
      return {
        livre_id: typeof item.livre_id === 'number' ? item.livre_id : (typeof item.livre_id === 'string' && !Number.isNaN(Number(item.livre_id)) ? Number(item.livre_id) : undefined),
        title: typeof item.title === 'string' ? item.title : undefined,
        quantite: typeof item.quantite === 'number' ? item.quantite : (typeof item.quantite === 'string' && !Number.isNaN(Number(item.quantite)) ? Number(item.quantite) : undefined),
        prix_unitaire_final: typeof item.prix_unitaire_final === 'number' ? item.prix_unitaire_final : undefined,
        prix_ligne_final: typeof item.prix_ligne_final === 'number' ? item.prix_ligne_final : undefined,
        reduction_appliquee: typeof item.reduction_appliquee === 'number' ? item.reduction_appliquee : undefined,
      };
    });

    const titles = lignes.map((l) => (l.title ?? '').trim()).filter(Boolean).join(', ');
    const totalQuantite = lignes.reduce((s, l) => s + (Number(l.quantite) || 0), 0);

    const payload: Record<string, unknown> = {
      transaction_id,
      user_id,
      vendeur: vendeur ?? null,
      title: titles || null,
      quantite: totalQuantite || 1,
      price: total_transaction_final ? Number(total_transaction_final) / Math.max(1, totalQuantite) : null,
      total_transaction_original: total_transaction_original ?? null,
      total_transaction_final: total_transaction_final ?? null,
      reduction_appliquee: montant_reduction ?? null,
      type_reduction: type_reduction ?? null,
      valeur_reduction: valeur_reduction ?? null,
      // si tu n'as pas la colonne 'lignes_json' en base, supprime cette clé (voir note)
      lignes_json: JSON.stringify(lignes),
      date_achat: new Date().toISOString(),
      statut: 'completed',
    };

    // Remove explicit nulls to avoid DB errors
    Object.keys(payload).forEach((k) => {
      if (payload[k] === null) delete payload[k];
    });

    const supabase = createClient();
    const { data, error } = await supabase.from('commande').insert([payload]).select('*');

    if (error) {
      console.error('Supabase insert error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message || error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, inserted: data, transaction_id }), { status: 200 });
  } catch (err: unknown) {
    console.error('API /commande exception:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500 });
  }
}