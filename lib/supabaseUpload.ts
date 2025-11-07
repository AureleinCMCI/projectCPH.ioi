import { createClient } from './supabase/clients';
import { compressImageFile } from './imageCompression';

const BUCKET_DEFAULT = 'image';
const FOLDER_DEFAULT = 'livres';

async function forwardLogToServer(payload: unknown) {
  try {
    // envoie "fire-and-forget" au serveur pour qu'il le logge dans le terminal
    await fetch('/api/logClientError', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // si l'envoi échoue (ex: hors ligne), on l'ignore
    // mais on le garde en console client pour debug local
    console.warn('[forwardLogToServer] failed', err);
  }
}

export async function uploadImageAndThumb(
  file: File,
  {
    bucket = BUCKET_DEFAULT,
    folder = FOLDER_DEFAULT,
    basename,
  }: { bucket?: string; folder?: string; basename?: string } = {}
) {
  const supabase = createClient();
  const base = basename ?? `livre-${Date.now()}`;

  // Debug info client-side
  console.log('[uploadImageAndThumb] start', { name: file.name, size: file.size, type: file.type });
  // forward to server so it appears in VSCode terminal
  void forwardLogToServer({
    location: 'uploadImageAndThumb',
    event: 'start',
    file: { name: file.name, size: file.size, type: file.type },
    timestamp: new Date().toISOString(),
  });

  try {
    // Vérifier la session utilisateur pour éviter les 403 RLS côté client
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      // log serveur / console pour debug
      console.warn('[uploadImageAndThumb] session check error', sessionErr);
      void forwardLogToServer({
        location: 'uploadImageAndThumb',
        step: 'session-check-error',
        error: sessionErr,
        timestamp: new Date().toISOString(),
      });
    }
    const session = sessionData?.session ?? null;
    if (!session) {
      // Forward pour voir dans le terminal de dev et renvoyer une erreur claire côté client
      void forwardLogToServer({
        location: 'uploadImageAndThumb',
        step: 'no-session',
        message: 'User not authenticated — abort upload',
        timestamp: new Date().toISOString(),
      });
      throw new Error('Vous devez être connecté·e pour envoyer une image.');
    }
  } catch (e) {
    // On laisse tomber ici : l'erreur sera interceptée dans le try/catch principal
    console.warn('[uploadImageAndThumb] session check unexpected error', e);
  }

  try {
    // compress main & thumb
    const main = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1800, quality: 0.8, mimeType: 'image/webp' });
    const thumb = await compressImageFile(file, { maxWidth: 150, maxHeight: 150, quality: 0.65, mimeType: 'image/webp' });

    const mainExt = main.name.substring(main.name.lastIndexOf('.'));
    const thumbExt = thumb.name.substring(thumb.name.lastIndexOf('.'));

    const mainPath = `${folder}/${base}${mainExt}`;
    const thumbPath = `${folder}/${base}-thumb${thumbExt}`;

    // upload main
    const res1 = await supabase.storage.from(bucket).upload(mainPath, main, {
      cacheControl: '3600',
      upsert: false,
    });
    if (res1.error) {
      console.error('[uploadImageAndThumb] upload main error', res1.error);
      void forwardLogToServer({
        location: 'uploadImageAndThumb',
        step: 'upload-main',
        error: res1.error,
        file: { name: file.name, size: file.size, type: file.type },
        mainPath,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Upload main failed: ${res1.error.message || JSON.stringify(res1.error)}`);
    }
    console.log('[uploadImageAndThumb] upload main ok', res1);
    void forwardLogToServer({
      location: 'uploadImageAndThumb',
      step: 'upload-main-ok',
      mainPath,
      timestamp: new Date().toISOString(),
    });

    // upload thumb
    const res2 = await supabase.storage.from(bucket).upload(thumbPath, thumb, {
      cacheControl: '86400',
      upsert: false,
    });
    if (res2.error) {
      console.error('[uploadImageAndThumb] upload thumb error', res2.error);
      void forwardLogToServer({
        location: 'uploadImageAndThumb',
        step: 'upload-thumb',
        error: res2.error,
        file: { name: file.name, size: file.size, type: file.type },
        mainPath,
        thumbPath,
        timestamp: new Date().toISOString(),
      });
      // rollback main (optionnel)
      try {
        await supabase.storage.from(bucket).remove([mainPath]);
        console.warn('[uploadImageAndThumb] rollback main performed');
        void forwardLogToServer({ location: 'uploadImageAndThumb', step: 'rollback-main', mainPath, timestamp: new Date().toISOString() });
      } catch (remErr) {
        console.warn('[uploadImageAndThumb] rollback main failed', remErr);
        void forwardLogToServer({ location: 'uploadImageAndThumb', step: 'rollback-failed', remErr, timestamp: new Date().toISOString() });
      }
      throw new Error(`Upload thumb failed: ${res2.error.message || JSON.stringify(res2.error)}`);
    }
    console.log('[uploadImageAndThumb] upload thumb ok', res2);
    void forwardLogToServer({
      location: 'uploadImageAndThumb',
      step: 'upload-thumb-ok',
      mainPath,
      thumbPath,
      timestamp: new Date().toISOString(),
    });

    // get public urls
    const mainUrlData = supabase.storage.from(bucket).getPublicUrl(mainPath);
    const thumbUrlData = supabase.storage.from(bucket).getPublicUrl(thumbPath);

    const mainUrl = mainUrlData?.data?.publicUrl ?? null;
    const thumbUrl = thumbUrlData?.data?.publicUrl ?? null;

    if (!mainUrl || !thumbUrl) {
      console.warn('[uploadImageAndThumb] getPublicUrl returned null', { mainUrlData, thumbUrlData });
      void forwardLogToServer({
        location: 'uploadImageAndThumb',
        step: 'getPublicUrl-null',
        mainUrlData,
        thumbUrlData,
        mainPath,
        thumbPath,
        timestamp: new Date().toISOString(),
      });
      // On retourne quand même les paths pour debug
      return { imageUrl: mainUrl, thumbUrl, mainPath, thumbPath, mainUrlData, thumbUrlData };
    }

    console.log('[uploadImageAndThumb] done', { mainUrl, thumbUrl });
    void forwardLogToServer({
      location: 'uploadImageAndThumb',
      step: 'done',
      mainUrl,
      thumbUrl,
      mainPath,
      thumbPath,
      timestamp: new Date().toISOString(),
    });
    return { imageUrl: mainUrl, thumbUrl, mainPath, thumbPath };
  } catch (err: any) {
    // catch any unexpected exception and forward
    console.error('[uploadImageAndThumb] unexpected error', err);
    void forwardLogToServer({
      location: 'uploadImageAndThumb',
      step: 'unexpected-error',
      error: { message: err?.message, stack: err?.stack },
      file: { name: file.name, size: file.size, type: file.type },
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}