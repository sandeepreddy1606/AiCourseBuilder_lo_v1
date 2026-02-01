import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://ojfuanjizrmlixqoqoky.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZnVhbmppenJtbGl4cW9xb2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MzQxNjQsImV4cCI6MjA3NzQxMDE2NH0.pHvVruVCqaGSpAvp_YDbRGbVIc0TGFjN65Z-4g3GXMo"

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

async function testConnection() {
  console.log("Attempting to connect to Supabase auth...")
  try {
    // Attempt sign in with dummy credentials to check connectivity
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "test_connectivity@example.com",
      password: "wrong_password_123"
    })
    
    if (error) {
      console.log("Connection successful. Received expected auth error:")
      console.log(`Status: ${error.status}`)
      console.log(`Message: ${error.message}`)
    } else {
      console.log("Unexpected success:", data)
    }
  } catch (err) {
    console.error("Connection failed with exception:", err)
  }
}

testConnection()
