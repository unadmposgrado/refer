import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient('https://oyefwyqevymkcdpsgvkw.supabase.co', 'sb_publishable_hUqkZIvfFq-8lfwXEp9N9w_2gDd1ywP');

(async()=>{
  const { data, error } = await supabase.from('citations').select('id,user_id').limit(10);
  console.log('error', error);
  console.log('data', data);
})();