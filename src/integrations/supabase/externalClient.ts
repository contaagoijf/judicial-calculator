import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://xitpsqtcxraejzlxvvmn.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdHBzcXRjeHJhZWp6bHh2dm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTIwOTUsImV4cCI6MjA4OTUyODA5NX0.MdJXkgi6hVWVvg74ndI3iaAvKX-iCYmfdZHBPDm-js0';

export const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
