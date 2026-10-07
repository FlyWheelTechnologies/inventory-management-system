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

    const subject = `Automated Notice: System Resource Scale-Down — FlorzyAngel Enterprise`;
    const results = [];

    for (const admin of recipients) {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Notice</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 22px 28px;">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">
                Operational Advisory
              </span>
              <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                Flywheel Stock Management
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 28px 24px 28px; font-size: 14px; line-height: 1.65; color: #334155;">
              <p style="margin-top: 0; margin-bottom: 16px;">
                Dear <strong>${admin.name}</strong>,
              </p>

              <p style="margin-bottom: 16px;">
                Please be advised that due to extended inactivity and reduced transactional volume on your account, allocated infrastructure resources are scheduled to be wound down.
              </p>

              <div style="background-color: #f8fafc; border-left: 3px solid #64748b; padding: 12px 16px; margin: 18px 0; font-size: 13.5px; color: #475569;">
                <strong>Data Assurance:</strong> Your data remains completely secure, private, and preserved until such time as you wish to re-engage. No records will be altered or removed.
              </div>

              <p style="margin-bottom: 24px;">
                When your team is ready to resume active operations, provisioned capacity can be promptly restored. To re-engage, simply reply directly to this notification.
              </p>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 13px; color: #64748b;">
                Sincerely,<br>
                <strong style="color: #0f172a;">This is an Automated email</strong><br>
                Flywheel Technologies
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 14px 28px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} Flywheel Technologies. All rights reserved.
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
