import { supabase } from './supabase';

const MAX_WIDTH = 1280;
const QUALITY = 0.8;

// spec.md「アップロード前に画像を最大1280px・品質80%に自動圧縮する」に対応（ブラウザのcanvasで圧縮）
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context を取得できませんでした');
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像の圧縮に失敗しました'))),
      'image/jpeg',
      QUALITY,
    );
  });
}

export async function uploadOnsenPhoto(file: File): Promise<{ url?: string; error?: string }> {
  try {
    const blob = await compressImage(file);
    const path = `${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('onsen-photos')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from('onsen-photos').getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '画像のアップロードに失敗しました' };
  }
}

// 宿泊プラン写真用。パスを {onsenId}/{uuid}.jpg にして、ストレージRLS側で
// storage.foldername(name) からonsen_idを取り出しis_owner_of()判定できるようにする
export async function uploadLodgingPlanPhoto(onsenId: string, file: File): Promise<{ url?: string; error?: string }> {
  try {
    const blob = await compressImage(file);
    const path = `${onsenId}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('lodging-plan-photos')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from('lodging-plan-photos').getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '画像のアップロードに失敗しました' };
  }
}
