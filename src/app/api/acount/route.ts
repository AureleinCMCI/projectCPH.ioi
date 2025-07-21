import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/clients";

type Profile = {
  id: string;
  name: string;
  password: string;
  updated_at?: string;
  photo?: string;
};

// GET: Récupérer un profil par ID
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return Response.json({ error: "Missing user ID" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('USER')
    .select('name, password, photo , admin')
    .eq('id', userId)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ data });
}

// PATCH: Mettre à jour un profil
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json() as Partial<Profile>;
  const { id, name, password } = body;

  if (!id) {
    return Response.json({ error: "Missing user ID" }, { status: 400 });
  }

  const { error } = await supabase.from('profiles').upsert({
    id,
    name,
    password,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ message: 'Profile updated!' });
}
