const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = {
  supabase: createClient(supabaseUrl, supabaseAnonKey),
};
