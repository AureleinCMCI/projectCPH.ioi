import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/adminClient';

const BUCKET_DEFAULT = 'image'; // ← CORRECTION : "image" au lieu de "images"
const FOLDER_DEFAULT = 'livres';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    
    // 🔍 DEBUG : Afficher tous les champs reçus
    console.log('[uploadImageAndThumb] FormData entries:');
    for (const [key, value] of form.entries()) {
      if (value instanceof File) {
        console.log(`  - ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  - ${key}: ${value}`);
      }
    }
    
    const mainImage = form.get('mainImage') as File | null;
    const thumbImage = form.get('thumbImage') as File | null;
    const basename = (form.get('basename') as string) || `livre-${Date.now()}`;

    if (!mainImage || !thumbImage) {
      console.error('[uploadImageAndThumb] Missing images', { 
        mainImage: !!mainImage, 
        thumbImage: !!thumbImage,
        receivedKeys: Array.from(form.keys())
      });
      return NextResponse.json({ 
        error: 'mainImage et thumbImage requis',
        received: Array.from(form.keys())
      }, { status: 400 });
    }

    console.log('[uploadImageAndThumb] Start upload', { 
      basename, 
      mainSize: mainImage.size, 
      thumbSize: thumbImage.size 
    });

    // Extensions des fichiers compressés
    const mainExt = mainImage.name.substring(mainImage.name.lastIndexOf('.')) || '.webp';
    const thumbExt = thumbImage.name.substring(thumbImage.name.lastIndexOf('.')) || '.webp';

    // Chemins dans le bucket
    const mainPath = `${FOLDER_DEFAULT}/${basename}${mainExt}`;
    const thumbPath = `${FOLDER_DEFAULT}/${basename}-thumb${thumbExt}`;

    // Upload main image avec Service Role (bypass RLS)
    const mainBuffer = await mainImage.arrayBuffer();
    const { error: mainError } = await supabaseAdmin.storage
      .from(BUCKET_DEFAULT)
      .upload(mainPath, new Uint8Array(mainBuffer), {
        cacheControl: '3600',
        upsert: false,
        contentType: mainImage.type || 'image/webp',
      });

    if (mainError) {
      console.error('[uploadImageAndThumb] Main upload error', mainError);
      return NextResponse.json({ error: mainError.message }, { status: 500 });
    }

    console.log('[uploadImageAndThumb] Main image uploaded', mainPath);

    // Upload thumbnail avec Service Role
    const thumbBuffer = await thumbImage.arrayBuffer();
    const { error: thumbError } = await supabaseAdmin.storage
      .from(BUCKET_DEFAULT)
      .upload(thumbPath, new Uint8Array(thumbBuffer), {
        cacheControl: '86400',
        upsert: false,
        contentType: thumbImage.type || 'image/webp',
      });

    if (thumbError) {
      console.error('[uploadImageAndThumb] Thumb upload error', thumbError);
      // Rollback main image
      await supabaseAdmin.storage.from(BUCKET_DEFAULT).remove([mainPath]);
      return NextResponse.json({ error: thumbError.message }, { status: 500 });
    }

    console.log('[uploadImageAndThumb] Thumb image uploaded', thumbPath);

    // Récupérer les URLs publiques
    const mainUrl = supabaseAdmin.storage.from(BUCKET_DEFAULT).getPublicUrl(mainPath).data.publicUrl;
    const thumbUrl = supabaseAdmin.storage.from(BUCKET_DEFAULT).getPublicUrl(thumbPath).data.publicUrl;

    console.log('[uploadImageAndThumb] Success', { mainUrl, thumbUrl });

    return NextResponse.json({ 
      imageUrl: mainUrl, 
      thumbUrl,
      mainPath,
      thumbPath 
    });

  } catch (err: any) {
    console.error('[uploadImageAndThumb] Unexpected error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}