// File: supabase/functions/_shared/storageHelpers.ts

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
  companyId: string, // The company this upload belongs to
  userId: string // The user performing the upload
): Promise<string | null> {
  try {
    const originalFileName = file.fileName || 'unknown_file';

    const fileExt = originalFileName.includes('.')
      ? originalFileName.split('.').pop()?.toLowerCase() || 'bin'
      : 'bin';

    const baseName = originalFileName.includes('.')
      ? originalFileName.substring(0, originalFileName.lastIndexOf('.'))
      : originalFileName;

    const safeBaseName =
      baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '') || 'attachment';

    // Construct the new, secure path: {company_id}/{user_id}/{timestamp_filename}
    const filePath = `${companyId}/${userId}/${Date.now()}_${safeBaseName}.${fileExt}`;
    const mimeType = file.mimeType || 'application/octet-stream';

    console.log(`[Shared Upload] Secure Path: ${filePath}, Type: ${mimeType}`);

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
