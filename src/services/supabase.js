import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "vwyudrmxatuukcbncats";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  `https://${PROJECT_REF}.supabase.co`;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabasePublishableKey) {
  throw new Error(
    "Velvet Android is missing its public Supabase client key. " +
    "Run npm run android:sync from the prepared Android project so the installer can import your existing Velvet .env."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  }
);
