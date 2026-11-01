import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabasePublishableKey } from './config.js';
export const cloud = supabaseUrl ? createClient(supabaseUrl, supabasePublishableKey) : null;
export function friendlyError(error) {
  if (error?.code === '42P01' || error?.code === 'PGRST205') return 'Databasen er ikke satt opp ennå. Kjør databaseoppsettet i Supabase først.';
  if (error?.code === '42501') return 'Kontoen mangler tilgang. Kontroller databaseoppsettet i Supabase.';
  if (error?.message?.includes('Invalid login credentials')) return 'Feil e-post eller passord.';
  if (error?.message?.includes('Email not confirmed')) return 'Bekreft e-postadressen via lenken du har fått før du logger inn.';
  if (error?.status === 429) return 'For mange forsøk. Vent litt og prøv igjen.';
  return 'Kunne ikke kontakte kontoen. Kontroller internettforbindelsen og prøv igjen. Teksten din er ikke slettet.';
}
