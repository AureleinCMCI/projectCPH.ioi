export async function dataUrlToFile(dataUrl: string, filename = 'photo.jpg') {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type.split('/')[1] || 'jpg';
  return new File([blob], filename.replace(/\.[^/.]+$/, '') + `.${ext}`, { type: blob.type });
}

export async function compressImageFile(
  file: File,
  { maxWidth = 1200, maxHeight = 1800, quality = 0.8, mimeType = 'image/webp' } = {}
): Promise<File> {
  // crée un bitmap (plus rapide et fiable que <img>)
  const imgBitmap = await createImageBitmap(file);
  // width et height ne sont jamais réassignés — utiliser const pour satisfaire eslint prefer-const
  const { width, height } = imgBitmap;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imgBitmap, 0, 0, targetWidth, targetHeight);

  const blob: Blob | null = await new Promise(resolve =>
    canvas.toBlob(resolve as BlobCallback, mimeType, quality)
  );
  if (!blob) throw new Error('Impossible de compresser l\'image (toBlob returned null)');

  const extension = mimeType === 'image/webp' ? '.webp' : file.name.substring(file.name.lastIndexOf('.'));
  const safeName = file.name.replace(/\.[^/.]+$/, '') + extension;
  return new File([blob], safeName, { type: mimeType });
}