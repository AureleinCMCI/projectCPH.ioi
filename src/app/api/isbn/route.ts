import { createClient } from '@/lib/supabase/clients';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();

  try {
    // CAS 1 : Insertion multiple (Optimisation)
    // Si on reçoit { livre_id: 123, isbns: ["123", "456", "789"] }
    if (body.livre_id && Array.isArray(body.isbns) && body.isbns.length > 0) {
      const rows = body.isbns.map((isbn: string | number) => ({
        livre_id: body.livre_id,
        isbn: isbn
      }));

      // On insère tout d'un coup
      const { data, error } = await supabase.from('isbn').insert(rows).select();

      if (error) throw error;
      return NextResponse.json({ message: `${rows.length} ISBNs ajoutés`, data }, { status: 200 });
    }

    // CAS 2 : Insertion unique (Votre ancien code, pour compatibilité)
    // Si on reçoit { livre_id: 123, isbn: "123" }
    else if (body.isbn && body.livre_id) {
      const { data, error } = await supabase.from('isbn').insert([
        { isbn: body.isbn, livre_id: body.livre_id }
      ]).select();

      if (error) throw error;
      return NextResponse.json({ message: 'ISBN ajouté', data }, { status: 200 });
    }

    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erreur POST /api/isbn:', message);
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 });
  }
}

// Ajoutez cette fonction GET juste avant ou après la fonction POST
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const livre_id = searchParams.get('livre_id');

  try {
    let query = supabase.from('isbn').select('*');

    // Si un ID de livre est fourni, on filtre
    if (livre_id) {
      query = query.eq('livre_id', livre_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });

  } catch (error: unknown) {
    // Correction du type 'any'
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erreur GET /api/isbn:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}