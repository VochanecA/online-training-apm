
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rmqewezmkomhtmvkkmao.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWV3ZXpta29taHRtdmtrbWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODk3MDMsImV4cCI6MjA4NTE2NTcwM30.FQ--XG2LtJLvPCf8jyVAQuyFlIb1SCFiW3w1m9sPR_k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
