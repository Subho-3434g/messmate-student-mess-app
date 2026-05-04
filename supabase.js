import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://duprrhzdqhlmwkdqygux.supabase.co";
const supabaseKey = "sb_publishable_wyXbiPBz0zdtUuYaRyAeIw_Xe1SRVVd";

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
