import { createClient } from "@supabase/supabase-js"
import { sendEmail } from "../_shared/resend.ts"

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

    // 4. Send Welcome Email
    await sendEmail({
      to: email,
      subject: 'Welcome to Flywheel IMS',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
          <h1 style="color: #f15a24;">Welcome to Flywheel IMS</h1>
          <p>Hi ${full_name || 'there'},</p>
          <p>An account has been created for you on the Flywheel Stock Management System.</p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Role:</strong> ${role}</p>
            <p style="margin: 8px 0 0;"><strong>Login Email:</strong> ${email}</p>
          </div>
          <p>You can now log in using your email and the password provided by your administrator.</p>
          <a href="${Deno.env.get('APP_URL') ?? '#'}" style="display: inline-block; background: #1e293b; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Log In Now</a>
        </div>
      `
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
