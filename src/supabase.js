import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) console.error('Brak konfiguracji Supabase. Ustaw sekrety GitHub.');
export const supabase = createClient(url || 'https://example.supabase.co', key || 'missing');