import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Both values are public (the publishable key only grants what RLS allows).
// Override them with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY if you move projects.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://ievkiawudzjppnlfgouz.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_vihFM7ro2lZDLhfVG8Hojg_OdMy77E5'

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const ASSET_BUCKET = 'packie-assets'

/** Uploads an image to the public asset bucket and returns its public URL. */
export async function uploadAsset(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(ASSET_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Turns a Supabase / Postgres error into a friendly message. */
export function errorMessage(err: unknown): string {
  if (!err) return 'Something went wrong.'
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return 'Something went wrong.'
}
