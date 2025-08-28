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
  const type = searchParams.get('type'); // 'profile' ou 'photos'

  if (!userId) {
    return Response.json({ error: "Missing user ID" }, { status: 400 });
  }

  if (type === 'photos') {
    // Récupérer toutes les photos de l'utilisateur
    const { data, error } = await supabase
      .from('USER')
      .select('photo')
      .eq('id', userId)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Parser le champ photo qui contient un tableau JSON
    let photosArray = [];
    if (data.photo) {
      try {
        photosArray = JSON.parse(data.photo);
      } catch {
        // Si c'est une seule photo (ancien format)
        photosArray = [{ id: '1', url: data.photo, created_at: new Date().toISOString() }];
      }
    }

    return Response.json({ data: photosArray });
  } else {
    // Récupérer le profil utilisateur
    const { data, error } = await supabase
      .from('USER')
      .select('name, password, photo, admin')
      .eq('id', userId)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ data });
  }
}

// PATCH: Mettre à jour un profil ou l'avatar principal
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json() as Partial<Profile>;
  const { id, name, password, photo } = body;

  if (!id) {
    return Response.json({ error: "Missing user ID" }, { status: 400 });
  }

  if (photo) {
    // Définir l'avatar principal (garder toutes les photos, juste marquer laquelle est active)
    const { data: existingUser, error: fetchError } = await supabase
      .from('USER')
      .select('photo')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 400 });
    }
    
    // Parser les photos existantes
    let photosArray = [];
    if (existingUser.photo) {
      try {
        photosArray = JSON.parse(existingUser.photo);
      } catch {
        photosArray = [{ id: '1', url: existingUser.photo, created_at: new Date().toISOString() }];
      }
    }
    
    // Marquer la photo sélectionnée comme active
    photosArray = photosArray.map(p => ({
      ...p,
      isActive: p.url === photo
    }));
    
    // Mettre à jour avec le tableau modifié
    const { error } = await supabase
      .from('USER')
      .update({ photo: JSON.stringify(photosArray) })
      .eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ message: 'Avatar updated!' });
  } else {
    // Mise à jour du profil (nom, mot de passe)
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
}
/*
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
} */

  export async function POST(request: NextRequest): Promise<Response> {
    try {
      const supabase = createClient();
      const contentType = request.headers.get('content-type');
      
      if (contentType && contentType.includes('multipart/form-data')) {
        // Traitement FormData pour l'insertion de photo
        const formData = await request.formData();
        const id = formData.get('id') as string;
        const file = formData.get('file') as File;
        
        if (!id || !file) {
          return new Response(JSON.stringify({ error: "ID utilisateur et fichier requis" }), { status: 400 });
        }
        
        // Convertir le fichier en base64
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Photo = `data:${file.type};base64,${buffer.toString('base64')}`;
        
        // Récupérer les photos existantes
        const { data: existingUser, error: fetchError } = await supabase
          .from('USER')
          .select('photo')
          .eq('id', id)
          .single();
        
        if (fetchError) {
          return new Response(JSON.stringify({ error: fetchError.message }), { status: 400 });
        }
        
        // Créer un tableau de photos (ajouter la nouvelle à la liste existante)
        let photosArray = [];
        if (existingUser.photo) {
          try {
            photosArray = JSON.parse(existingUser.photo);
          } catch {
            // Si le parsing échoue, on considère que c'est une seule photo
            photosArray = [existingUser.photo];
          }
        }
        
        // Ajouter la nouvelle photo avec un timestamp
        const newPhoto = {
          id: Date.now().toString(),
          url: base64Photo,
          created_at: new Date().toISOString()
        };
        
        photosArray.push(newPhoto);
        
        // Mettre à jour le champ photo avec le tableau complet
        const { data, error } = await supabase
          .from('USER')
          .update({ photo: JSON.stringify(photosArray) })
          .eq('id', id)
          .select()
          .maybeSingle();
        
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }
        
        return new Response(JSON.stringify({ 
          message: 'Photo mise à jour avec succès !', 
          photo: data, 
          success: true 
        }), { status: 200 });
        
      } else {
        // Traitement JSON pour l'insertion d'utilisateur
        const { photo }: { photo?: string } = await request.json();
        
        const { data, error } = await supabase
          .from('USER')
          .insert([{ photo }])
          .select()
          .maybeSingle();
        
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }
        
        return new Response(JSON.stringify({ 
          message: 'Inscription réussie !', 
          user: data, 
          success: true 
        }), { status: 201 });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Erreur serveur :", err.message);
        return new Response(JSON.stringify({ error: "Erreur serveur", details: err.message }), { status: 500 });
      }
      console.error("Erreur serveur :", err);
      return new Response(JSON.stringify({ error: "Erreur serveur", details: err instanceof Error ? err.message : 'Erreur inconnue' }), { status: 500 });
    }
  }
  