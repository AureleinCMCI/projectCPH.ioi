import { createClient } from '@/lib/supabase/clients';
import bcrypt from 'bcrypt';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = createClient();
    const { name, password, photo }: { name: string; password: string; photo?: string } = await request.json();
    console.log("Tentative d'inscription avec :", { name, password });

    // Vérifie si le nom existe déjà
    const { data: existingUser, error: selectError } = await supabase
      .from('USER')
      .select('id')
      .eq('name', name)
      .maybeSingle();

    if (selectError) {
      console.error("Erreur lors de la vérification du nom :", selectError);
      return new Response(JSON.stringify({ error: selectError.message }), { status: 400 });
    }

    if (existingUser) {
      return new Response(JSON.stringify({ error: "Ce nom existe déjà", success: false }), { status: 409 });
    }

    // Insère le nouvel utilisateu
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('USER')
      .insert([{ name, password: hashedPassword , photo }])
      .select()
      .maybeSingle();
    console.log("Résultat Supabase :", data, error);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ message: 'Inscription réussie !', user: data, success: true }), { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Erreur serveur :", err.message);
      return new Response(JSON.stringify({ error: "Erreur serveur", details: err.message }), { status: 500 });
    }
    console.error("Erreur serveur :", err);
    return new Response(JSON.stringify({ error: "Erreur serveur", details: err instanceof Error ? err.message : 'Erreur inconnue' }), { status: 500 });
  }
}
