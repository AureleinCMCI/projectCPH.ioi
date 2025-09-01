import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

type livre = {
  title?: string;
  author?: string;
  description?: string;
  price?: number;
  image?: string;
  date_de_production?: string;
};

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get('isbn');
  const { data, error } = await supabase.from('livre').select('*').eq('isbn', isbn).maybeSingle();
  
  console.log("Résultat Supabase :", data, error);
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ data });

}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const livreData = await request.json() as livre;

    // Insertion d'une nouvelle commande
    const { data, error } = await supabase.from('livre').insert([livreData]).select().maybeSingle();



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
    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: errorMessage }),
      { status: 500 }
    );
  }
}

// PATCH pour mettre à jour uniquement l'image d'un livre
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { id, image } = await request.json();

    if (!id || !image) {
      return new Response(JSON.stringify({ error: 'id et image requis' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('livre')
      .update({ image })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({ message: 'Image mise à jour', livre: data, success: true }),
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('Erreur serveur :', err);
    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: errorMessage }),
      { status: 500 }
    );
  }
}
/* insersion dans la table isbn , le livre a le méme isbn que le livre dans la table livre */
