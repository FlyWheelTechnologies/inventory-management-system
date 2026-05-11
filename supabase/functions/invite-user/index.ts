import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, role, full_name } = await req.json()

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) throw authError

    // 2. Update the profile with the chosen role (trigger handles creation, we update role)
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ role, full_name })
      .eq('id', authData.user.id)

    if (profileError) throw profileError

    // 3. Log the action
    await supabaseClient.from('logs').insert({
      user_email: 'system/admin',
      user_role: 'admin',
      action: 'USER_INVITE',
      details: `Created new user ${email} with role ${role}`
    })

    return new Response(
      JSON.stringify({ message: 'User created successfully', user: authData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
