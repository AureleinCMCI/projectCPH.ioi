import { createClient } from "@/lib/supabase/clients";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase.from("USER").select("*").limit(5);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ data }), { status: 200 });
}