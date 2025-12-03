import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Récupérer l'ID depuis les paramètres de requête (query parameters)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: "ID utilisateur requis" }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('USER')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (error) {
      console.error('Erreur Supabase:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    
    if (!data) {
      return new Response(JSON.stringify({ error: "Utilisateur non trouvé" }), { status: 404 });
    }
    
    return new Response(JSON.stringify({ data, success: true }), { status: 200 });
  } catch (err) {
    console.error('Erreur lors de la récupération du compte:', err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
}
