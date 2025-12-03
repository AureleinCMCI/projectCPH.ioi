import { createClient } from '@/lib/supabase/clients';


export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from('blocages_inventaire').select('*');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
  return new Response(JSON.stringify({ data }), { status: 200 });
}
