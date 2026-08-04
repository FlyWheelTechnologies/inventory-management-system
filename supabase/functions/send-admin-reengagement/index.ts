// supabase/functions/send-admin-reengagement/index.ts
//
// Supabase Edge Function to send a re-engagement email to all system admins.
//
// Trigger via HTTP POST or Supabase Scheduled Webhook / Dashboard:
//   URL: https://<your-project>.supabase.co/functions/v1/send-admin-reengagement
//   Headers: Authorization: Bearer <anon-or-service-role-key>

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../_shared/resend.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const replyTo = 'godwinokro2020@gmail.com';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let admins: Array<{ email: string; full_name?: string }> = [];

    // Query Supabase profiles if credentials are key-bound
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: dbAdmins, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'admin');

      if (!error && dbAdmins) {
        admins = dbAdmins.filter(a => a.email);
      }
    }

    // Default & known system admin fallback list
    const knownAdmins = [
      { email: 'godwinokro2020@gmail.com', full_name: 'Godwin Okro' },
      { email: 'admin@florzyangel.com', full_name: 'Angel' },
      { email: 'florzyangel1@gmail.com', full_name: 'System Admin' },
    ];

    // Deduplicate admin emails
    const adminMap = new Map<string, string>();
    for (const a of knownAdmins) {
      if (a.email) adminMap.set(a.email.toLowerCase(), a.full_name || 'Admin');
    }
    for (const a of admins) {
      if (a.email) adminMap.set(a.email.toLowerCase(), a.full_name || 'Admin');
    }

    const recipients = Array.from(adminMap.entries()).map(([email, name]) => ({ email, name }));

    console.log(`Sending re-engagement email to ${recipients.length} admin(s):`, recipients);

    const subject = `We miss you! — Flywheel Technologies`;
    const results = [];

    for (const admin of recipients) {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We miss you!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e5e7eb;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 36px 32px; text-align: center;">
              <span style="display: inline-block; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(147, 197, 253, 0.3); color: #93c5fd; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                Flywheel Technologies
              </span>
              <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Flywheel Stock Management
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px; color: #334155;">
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
                <h2 style="color: #1e40af; margin: 0; font-size: 22px; font-weight: 700;">
                  We miss you. 👋
                </h2>
              </div>

              <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
                Hi <strong>${admin.name}</strong>,
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
                It's been a while since you made any transactions on our system. We noticed your activity has been quiet recently, and we wanted to personally reach out to check in on how your business operations are progressing.
              </p>

              <!-- Callout Box -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 28px 0; text-align: center;">
                <p style="font-size: 15px; line-height: 1.5; color: #1e293b; font-weight: 600; margin: 0 0 16px 0;">
                  Please reply to this email to get back in touch with us!
                </p>
                <a href="mailto:${replyTo}?subject=Re:%20We%20miss%20you!" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin-bottom: 12px;">
                  Reply to this email
                </a>
                <p style="font-size: 14px; color: #0284c7; font-weight: 500; margin: 8px 0 0 0;">
                  Any way we can help, we are here.
                </p>
              </div>

              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                Whether you need assistance updating inventory, training team members, or configuring features for your business, we are always ready to assist.
              </p>

              <!-- Sign-off Block -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <p style="font-size: 15px; color: #334155; margin: 0 0 6px 0;">
                  Sincerely,
                </p>
                <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">
                  Godwin
                </p>
                <p style="font-size: 14px; color: #64748b; margin: 0;">
                  Flywheel Technologies
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0;">
                Sent to system administrators of Flywheel Stock Management System
              </p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
                &copy; ${new Date().getFullYear()} Flywheel Technologies. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await sendEmail({
        to: admin.email,
        subject,
        html,
        reply_to: replyTo,
      });

      results.push(admin.email);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully sent re-engagement email to ${results.length} admin(s)`,
        recipients: results,
        replyTo,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('send-admin-reengagement edge function error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
