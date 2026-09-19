import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "vwyudrmxatuukcbncats";
const DEFAULT_SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_vpnoAb2BAu1aOKqeWhMFyQ_2dbLHsb4";

function cleanEnvValue(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function resolveVelvetSupabaseUrl(value) {
  const candidate = cleanEnvValue(value);
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    const validProtocol = parsed.protocol === "https:" || parsed.protocol === "http:";
    const validHost = parsed.hostname === `${PROJECT_REF}.supabase.co`;

    if (!validProtocol || !validHost) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

const configuredUrl = resolveVelvetSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL,
);

const configuredPublishableKey = cleanEnvValue(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY,
);

/*
 * Velvet is permanently attached to one Supabase project.
 * Only trust an environment key when the environment URL also points to
 * that exact project. A malformed/wrong Vercel environment therefore
 * falls back to the known public client pair instead of crashing startup.
 */
const supabaseUrl = configuredUrl || DEFAULT_SUPABASE_URL;
const supabasePublishableKey =
  configuredUrl && configuredPublishableKey
    ? configuredPublishableKey
    : DEFAULT_SUPABASE_PUBLISHABLE_KEY;

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
