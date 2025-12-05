import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

export async function PATCH(req: Request) {
    try {
        const supabase = createClient();
        const { isbn, description } = await req.json();
        console.log("Données reçues pour mise à jour:", { isbn, description });

        if (!isbn || !description) {
            return new Response(JSON.stringify({ error: 'isbn et description requis' }), { status: 400 });
        }
        const { data, error } = await supabase
            .from('livre')
            .update({ description })
            .eq('isbn', isbn)
            .select()
            .maybeSingle();
        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(
            JSON.stringify({ message: 'Description mise à jour', livre: data, success: true }),
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