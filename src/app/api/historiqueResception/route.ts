import { createClient } from '@/lib/supabase/clients';
import { NextRequest } from 'next/server';

// Exemple de typage pour une ligne de la table "inventaire"
export type HistoriqueResception = {
  id?: number; // id généré par la BDD
  user_id: number;
  date_reception: number;
  quantite: number;
  livre_id: number;
  info: number;
}

export type Reception = {
  id?: number; // id généré par la BDD
  user_id: number;
  date_reception: number;
  quantite: number;
  livre_id: number;
  info: number;
  livre_title: string;
  date_de_production?: string;
}
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { quantite, name_user, livre_id, info, user_id, livre_title, date_de_production} = await request.json();
  if (!quantite || !name_user || !livre_id || !livre_title) {
    return new Response(JSON.stringify({ error: "Champs manquants" }), { status: 400 });
  }
  const { data, error } = await supabase
    .from('reception')
    .insert([{ quantite, name_user, livre_id, info, user_id, livre_title, date_de_production }])
    .select();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
  return new Response(JSON.stringify({ message: 'Réception ajoutée', user: data, success: true }), { status: 200 });
}

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from('reception').select('*'); 
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
  return new Response(JSON.stringify({ message: 'historique réception', user: data, success: true }), { status: 200 });
}   
