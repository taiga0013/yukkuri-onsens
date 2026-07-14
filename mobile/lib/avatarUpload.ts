import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const MAX_WIDTH = 1280;
const COMPRESS_QUALITY = 0.8;

// spec.md「アップロード前に画像を最大1280px・品質80%に自動圧縮する」に対応
export async function pickAndUploadAvatar(userId: string): Promise<{ url?: string; error?: string }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: '写真ライブラリへのアクセスが許可されていません' };
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || picked.assets.length === 0) return {};

  const rendered = await ImageManipulator.manipulate(picked.assets[0].uri).resize({ width: MAX_WIDTH }).renderAsync();
  const compressed = await rendered.saveAsync({ compress: COMPRESS_QUALITY, format: SaveFormat.JPEG });

  if (!supabase) return { error: 'Supabaseが未設定です' };

  const blob = await (await fetch(compressed.uri)).blob();
  const path = `${userId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // publicバケットはCDNキャッシュされるため、上書き後すぐ反映されるようクエリを付与する
  return { url: `${data.publicUrl}?t=${Date.now()}` };
}
