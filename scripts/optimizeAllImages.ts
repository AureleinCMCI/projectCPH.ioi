import { createClient } from '../lib/supabase/clients';
// (chemin relatif depuis /scripts vers /lib)

import { NextRequest } from 'next/server';
import sharp from "sharp";
import fetch from "node-fetch";

// Remplace ici par tes vraies infos API :
 // clé SECRET nécessaire, pas la clé publique !
const BUCKET = "tes-images";
const SRC_FOLDER = "livres";
const DEST_FOLDER = "optimized"; // destination pour les images compressées


async function optimizeAllImages() {
  const supabase = createClient();

  // 1. Liste tous les fichiers sources
  const { data: files, error } = await supabase.storage.from(BUCKET).list(SRC_FOLDER, {
    limit: 1000, // adapte ça selon le nombre
  });
  if (error) {
    console.error("Erreur listing:", error);
    return;
  }

  for (const file of files) {
    // 2. Récupère URL publique
    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(`${SRC_FOLDER}/${file.name}`).data.publicUrl;
    try {
      // 3. Télécharge le fichier
      const res = await fetch(publicUrl);
      const buffer = await res.buffer();

      // 4. Compresse avec sharp
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 800 }) // adapte la taille si besoin
        .toFormat("webp")
        .webp({ quality: 70 })
        .toBuffer();

      // 5. Upload dans dossier optimized/
      const destPath = `${DEST_FOLDER}/${file.name.replace(/\.[^/.]+$/, ".webp")}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(
        destPath,
        optimizedBuffer,
        { contentType: "image/webp", upsert: true }
      );

      if (uploadError) {
        console.error("Erreur upload optimized:", file.name, uploadError);
      } else {
        console.log("Image optimisée et uploadée:", destPath);
      }
    } catch (err) {
      console.error("Erreur traitement image:", file.name, err);
    }
  }
}

optimizeAllImages();
