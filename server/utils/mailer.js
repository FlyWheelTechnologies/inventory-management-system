const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  try {
    const data = await resend.emails.send({
      from: 'Flywheel <onboarding@resend.dev>', // Replace with your verified domain once ready
      to,
      subject,
      html: html || `<p>${text}</p>`,
      reply_to: replyTo || 'godwinokro2020@gmail.com',
    });
    return { success: true, data };
  } catch (error) {
    console.error('Resend Error:', error);
    return { success: false, error };
  }
};

const sendReceiptEmail = async (sale, customer, adminEmail) => {
  if (!customer?.email && !adminEmail) return;

  const subject = `Receipt for Sale #${sale.id} - Flywheel`;
  const customerName = customer?.name || sale.customer_name || 'Walk-in Customer';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
      <h2 style="color: #2563eb;">Flywheel Stock Management</h2>
      <p>Hi ${customerName},</p>
      <p>Thank you for your purchase. Here are your transaction details:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb;">Sale ID</th>
            <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb;">Date</th>
            <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">#${sale.id}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(sale.created_at || Date.now()).toLocaleDateString()}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">GHS ${sale.total_amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="background: #f0f9ff; padding: 16px; border-radius: 6px; color: #0369a1;">
        <strong>Payment Status:</strong> ${sale.payment_status} <br/>
        <strong>Amount Paid:</strong> GHS ${sale.amount_paid.toFixed(2)} <br/>
        <strong>Balance Due:</strong> GHS ${sale.balance_due.toFixed(2)}
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
        If you have any questions, please contact the admin.
      </p>
    </div>
  `;

  const results = [];
  if (customer?.email) {
    try {
      const res = await sendEmail({ to: customer.email, subject, html });
      results.push(res);
    } catch (e) {
      console.error('Error sending customer receipt email:', e);
    }
  }
  if (adminEmail) {
    try {
      const res = await sendEmail({ to: adminEmail, subject, html });
      results.push(res);
    } catch (e) {
      console.error('Error sending admin receipt email:', e);
    }
  }

  return results.length > 0 ? results[0] : undefined;
};

const sendLowStockAlert = async (adminEmail, product) => {
  const subject = `⚠️ Low Stock Alert: ${product.name}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 8px;">
      <h3 style="color: #ef4444;">Inventory Alert</h3>
      <p>The following item is running low on stock:</p>
      <ul>
        <li><strong>Product:</strong> ${product.name}</li>
        <li><strong>Current Stock:</strong> ${product.stock_quantity} ${product.selling_uom}</li>
        <li><strong>Threshold:</strong> ${product.low_stock_threshold}</li>
      </ul>
      <p>Please restock soon to avoid operational delays.</p>
    </div>
  `;
  return sendEmail({ to: adminEmail, subject, html });
};

const sendWeMissYouEmail = async (to, recipientName = 'Admin') => {
  const subject = `We miss you! — Flywheel Technologies`;
  const replyTo = 'godwinokro2020@gmail.com';
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
                Hi <strong>${recipientName}</strong>,
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
  return sendEmail({ to, subject, html, replyTo });
};

module.exports = { sendEmail, sendReceiptEmail, sendLowStockAlert, sendWeMissYouEmail };


