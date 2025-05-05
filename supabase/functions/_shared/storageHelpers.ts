// Example: supabase/functions/_shared/storageHelpers.ts
import { decode } from 'https://deno.land/std@0.203.0/encoding/base64.ts';
import { SupabaseClient } from 'supabase-js';

const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

export interface FileUploadData {
  base64: string;
  mimeType: string;
  fileName: string;
}

export async function uploadAttachment(
  supabase: SupabaseClient,
  file: FileUploadData,
  userId: string
): Promise<string | null> {
  try {
    const originalFileName = file.fileName || 'unknown_file'; // Fallback if name is missing

    // Extract extension reliably
    const fileExt = originalFileName.includes('.')
      ? originalFileName.split('.').pop()?.toLowerCase() || 'bin'
      : 'bin'; // Default if no extension found

    // Get base name (remove extension)
    const baseName = originalFileName.includes('.')
      ? originalFileName.substring(0, originalFileName.lastIndexOf('.'))
      : originalFileName;

    // Sanitize: Replace spaces with underscores AND remove other unsafe characters
    const safeBaseName =
      baseName
        .replace(/\s+/g, '_') // Replace one or more spaces with a single underscore
        .replace(/[^a-zA-Z0-9_.-]/g, '') || // Remove characters other than letters, numbers, underscore, dot, hyphen
      'attachment'; // Fallback base name if sanitization results in empty string

    // Construct the path
    const filePath = `public/${userId}/${Date.now()}_${safeBaseName}.${fileExt}`;
    const mimeType = file.mimeType || 'application/octet-stream';

    console.log(`[Shared Upload] Sanitized Path: ${filePath}, Type: ${mimeType}`);

    const fileData = decode(file.base64);

    const { data, error: uploadError } = await supabase.storage
      .from(TASK_ATTACHMENT_BUCKET)
      .upload(filePath, fileData, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }
    console.log(`[Shared Upload] Success: ${data?.path}`);
    return data?.path ?? null;
  } catch (error) {
    console.error('[Shared Upload] Error:', error.message);
    return null;
  }
}

export async function deleteAttachment(
  supabase: SupabaseClient,
  path: string | null
): Promise<boolean> {
  if (!path) return true;
  console.log(`[Shared Delete] Attempting: ${path}`);
  try {
    const { error } = await supabase.storage.from(TASK_ATTACHMENT_BUCKET).remove([path]);
    if (error) throw error;
    console.log(`[Shared Delete] Success: ${path}`);
    return true;
  } catch (error) {
    console.error(`[Shared Delete] Failed: ${path}:`, error.message);
    return false;
  }
}
