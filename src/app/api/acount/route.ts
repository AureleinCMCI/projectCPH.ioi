import { createClient } from "@/lib/supabase/clients";
import { NextRequest } from "next/server";

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

export async function PUT(req: NextRequest) {
  console.log('🔄 PUT /api/acount appelé');
  const supabase = createClient();
  
  try {
    const contentType = req.headers.get('content-type');
    console.log('📋 Content-Type:', contentType);
    
    if (contentType && contentType.includes('multipart/form-data')) {
      console.log('📁 Traitement FormData...');
      const formData = await req.formData();
      const id = formData.get('id') as string;
      const file = formData.get('file') as File;
      
      console.log('🆔 ID reçu:', id);
      console.log('📁 Fichier reçu:', file ? `${file.name} (${file.size} bytes)` : 'AUCUN');
      
      if (!id || !file) {
        console.log('❌ Données manquantes');
        return Response.json({ error: "Missing ID or file" }, { status: 400 });
      }
      
      // Convertir le fichier en base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Photo = `data:${file.type};base64,${buffer.toString('base64')}`;
      console.log('🔄 Fichier converti en base64, taille:', base64Photo.length);
      
      // Mettre à jour la base de données
      const { error } = await supabase
        .from('USER')
        .update({ photo: base64Photo })
        .eq('id', id);
      
      if (error) {
        console.error('❌ Erreur Supabase:', error);
        return Response.json({ error: error.message }, { status: 400 });
      }
      
      console.log('✅ Photo mise à jour en BDD pour l\'utilisateur:', id);
      return Response.json({ message: 'Photo updated!', photo: base64Photo });
      
    } else {
      console.log('�� Traitement JSON...');
      // ... reste du code JSON
    }
    
  } catch (error) {
    console.error('❌ Erreur dans PUT /api/acount:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}