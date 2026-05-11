// supabase/functions/send-receipt/index.ts
//
// Triggered by a Supabase Database Webhook on:
//   Table: public.sales
//   Events: INSERT
//
// Webhook setup (Supabase Dashboard → Database → Webhooks):
//   Name: on_sale_created
//   Table: sales
//   Events: INSERT
//   URL: https://<your-project>.supabase.co/functions/v1/send-receipt
//   Headers: Authorization: Bearer <your-service-role-key>

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../_shared/resend.ts';

Deno.serve(async (req: Request) => {
  try {
    // Supabase webhooks send a POST with the record payload
    const { record } = await req.json();

    // Only send receipt if a customer_id is linked
    if (!record?.customer_id) {
      return new Response('No customer linked — skipping receipt', { status: 200 });
    }

    // Use service role to read customer data (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: customer, error } = await supabase
      .from('customers')
      .select('full_name, email')
      .eq('id', record.customer_id)
      .single();

    if (error || !customer?.email) {
      console.log('Customer has no email — skipping');
      return new Response('No email on file', { status: 200 });
    }

    const isDeposit = record.payment_status === 'DEPOSIT';
    const statusColor = {
      PAID: '#059669',
      PARTIAL: '#f59e0b',
      DEPOSIT: '#3b82f6',
      UNPAID: '#ef4444',
    }[record.payment_status] ?? '#6b7280';

    const html = `
      <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px 28px; text-align: center;">
          <h1 style="color: #f15a24; margin: 0; font-size: 22px; letter-spacing: -0.5px;">Flywheel IMS</h1>
          <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">${isDeposit ? 'Deposit Confirmation' : 'Sale Receipt'}</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px;">
          <p style="font-size: 15px; color: #374151;">Hi <strong>${customer.full_name}</strong>,</p>
          <p style="font-size: 14px; color: #6b7280;">
            ${isDeposit
              ? 'Thank you for your advance deposit. We\'ll fulfil your order shortly.'
              : 'Thank you for your purchase. Here is your receipt.'}
          </p>

          <!-- Summary Box -->
          <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Reference</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; font-family: monospace;">#${record.id.slice(0, 8).toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Date</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right;">${new Date(record.created_at).toLocaleDateString('en-GH', { dateStyle: 'long' })}</td>
              </tr>
              <tr style="border-top: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-size: 16px; font-weight: 700;">Total</td>
                <td style="padding: 12px 0; font-size: 16px; font-weight: 700; text-align: right;">GHS ${parseFloat(record.total_amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">${isDeposit ? 'Deposit Paid' : 'Amount Paid'}</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #059669;">GHS ${parseFloat(record.amount_paid).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">${isDeposit ? 'Balance on Delivery' : 'Balance Due'}</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #ef4444;">GHS ${parseFloat(record.balance_due).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Status Badge -->
          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; background: ${statusColor}; color: #fff; padding: 6px 20px; border-radius: 20px; font-size: 13px; font-weight: 700; letter-spacing: 1px;">
              ${record.payment_status}
            </span>
          </div>

          ${isDeposit ? `
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 13px; color: #1e40af;">
            <strong>Deposit Note:</strong> Your payment of GHS ${parseFloat(record.amount_paid).toFixed(2)} has been received and is held as an advance deposit. The remaining GHS ${parseFloat(record.balance_due).toFixed(2)} is due on delivery.
          </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 28px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">Questions? Contact your store admin.</p>
          <p style="font-size: 11px; color: #d1d5db; margin: 4px 0 0;">Powered by Flywheel IMS</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: customer.email,
      subject: isDeposit
        ? `Deposit Confirmation #${record.id.slice(0, 8).toUpperCase()} — Flywheel`
        : `Receipt #${record.id.slice(0, 8).toUpperCase()} — Flywheel`,
      html,
    });

    return new Response(JSON.stringify({ sent: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-receipt error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
