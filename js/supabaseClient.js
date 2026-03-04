import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://oyefwyqevymkcdpsgvkw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hUqkZIvfFq-8lfwXEp9N9w_2gDd1ywP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
