import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

// Create Supabase client (or dummy fallback client if not configured yet)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

/**
 * Upload product image to Supabase Storage bucket 'product-images'
 * Validates file type and ensures maximum size <= 5MB
 */
export async function uploadProductImage(file: File): Promise<{ url: string | null; error: string | null }> {
  // 1. Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      url: null,
      error: `Invalid file type (${file.type || 'unknown'}). Please upload a JPEG, PNG, WEBP, or GIF image.`
    };
  }

  // 2. Validate file size (max 5MB)
  const maxSizeBytes = 5 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      url: null,
      error: `File size exceeds 5MB limit (${sizeMb}MB). Please compress the image before uploading.`
    };
  }

  if (!isSupabaseConfigured) {
    // If Supabase is not connected yet, convert to object URL / data URL for immediate preview
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ url: reader.result as string, error: null });
      };
      reader.onerror = () => {
        resolve({ url: null, error: 'Failed to read image file' });
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
    const filePath = `jerseys/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err.message || 'Unknown upload error' };
  }
}

/**
 * Delete a product image from Supabase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !imageUrl) {
    return { success: true, error: null };
  }

  try {
    // Extract file path from public URL if it's from our Supabase bucket
    const marker = '/product-images/';
    const markerIdx = imageUrl.indexOf(marker);
    if (markerIdx === -1) {
      // External image (e.g. unsplash or data URL), nothing to delete from storage
      return { success: true, error: null };
    }

    const filePath = imageUrl.substring(markerIdx + marker.length);
    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      console.warn('Could not delete image from Supabase storage:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete image' };
  }
}
