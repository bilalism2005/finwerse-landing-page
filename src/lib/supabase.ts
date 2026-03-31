import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zamjqukgoolsqxllnfvs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbWpxdWtnb29sc3F4bGxuZnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTUzNTAsImV4cCI6MjA5MDUzMTM1MH0.bDlLATQgXEXKPOvxLQHOX_HmC8uNJqwU-kcMx82-ras'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
