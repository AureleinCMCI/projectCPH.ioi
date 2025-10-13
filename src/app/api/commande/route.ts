import { createClient } from '@/lib/supabase/clients';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from('commande').select('*');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ data }), { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      transaction_id,
      user_id,
      vendeur,
      total_transaction_original,
      total_transaction_final,
      montant_reduction,
      type_reduction,
      valeur_reduction,
      lignes
    } = body;

    if (!transaction_id || !user_id || !Array.isArray(lignes) || lignes.length === 0) {
      return new Response(JSON.stringify({ error: 'transaction_id, user_id et lignes requis' }), { status: 400 });
    }

    const titles = lignes.map((l: any) => (l.title || '').trim()).filter(Boolean).join(', ');
    const totalQuantite = lignes.reduce((s: number, l: any) => s + (Number(l.quantite) || 0), 0);

    const payload: any = {
      transaction_id,
      user_id,
      vendeur: vendeur ?? null,
      title: titles || null,
      quantite: totalQuantite || 1,
      // stocker le total global
      price: total_transaction_final ? Number(total_transaction_final) / Math.max(1, totalQuantite) : null,
      total_transaction_original: total_transaction_original ?? null,
      total_transaction_final: total_transaction_final ?? null,
      reduction_appliquee: montant_reduction ?? null,
      type_reduction: type_reduction ?? null,
      valeur_reduction: valeur_reduction ?? null,
      lignes_json: JSON.stringify(lignes),
      date_achat: new Date().toISOString(),
      statut: 'completed'
    };

    // Supprimer les clés nulles si besoin
    Object.keys(payload).forEach(k => payload[k] === null && delete payload[k]);

    const supabase = createClient();
    const { data, error } = await supabase.from('commande').insert([payload]).select('*');

    if (error) {
      console.error('Supabase insert error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message || error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, inserted: data, transaction_id }), { status: 200 });
  } catch (err: any) {
    console.error('API /commande exception:', err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500 });
  }
}