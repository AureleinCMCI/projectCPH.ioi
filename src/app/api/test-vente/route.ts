import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const supabase = await createClient(); // service-role key

    // Appel unique à la RPC atomique
    const { data, error } = await supabase.rpc('rpc_vente_atomique', { payload });

    if (error) {
      console.error('Erreur RPC vente atomique:', error);
      return new Response(
        JSON.stringify({ status: 'error', error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gérer réponse RPC
    if (data?.status === 'error') {
      return new Response(
        JSON.stringify(data),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ result: data, status: 'ok' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erreur serveur test-vente:', message);
    return new Response(
      JSON.stringify({ status: 'error', message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
export async function GET() {
  const supabase = createClient();
  const { data, error } = await (await supabase).rpc('rpc_get_commandes_atomique_json_elems').select('*');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ data }), { status: 200 });
}