// supabase/functions/signup-handler/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers to allow requests from any origin.
// This is important for your mobile app to be able to call this function.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request ) => {
  // This is a pre-flight request. It's a browser/client security check.
  // We must respond to it correctly.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- 1. Get Email and Password ---
    const { email, password } = await req.json()
    if (!email || !password) {
      throw new Error('Email and password are required.')
    }

    // --- 2. Create Supabase Admin Client ---
    // This uses environment variables that we will set in the Supabase Dashboard.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- 3. Create the User in Supabase Auth ---
    // We use the admin client to create the user directly.
    const { data: { user }, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // IMPORTANT: We will confirm this with Clerk.
    })

    if (supabaseError) {
      // If the user already exists, return a specific error.
      if (supabaseError.message.includes('already exists')) {
        return new Response(JSON.stringify({ error: 'A user with this email already exists.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // 409 Conflict
        })
      }
      // For any other error, throw it.
      throw supabaseError
    }

    // --- 4. Trigger Clerk's Verification Email ---
    const CLERK_SECRET_KEY = Deno.env.get('CLERK_SECRET_KEY')!

    // We call the Clerk API directly using `fetch`.
    // This is the ONLY thing we are using Clerk for.
    await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // We only provide the essentials. Clerk's dashboard settings will handle the rest.
        email_address: [email],
        password: `supabaserandom_${crypto.randomUUID()}`,
        skip_password_checks: true,
      }),
    })

    // --- 5. Success ---
    // Return a success message to the mobile app.
    return new Response(JSON.stringify({ message: 'Sign-up successful. Please check your email to verify your account.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Handle any unexpected errors.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
