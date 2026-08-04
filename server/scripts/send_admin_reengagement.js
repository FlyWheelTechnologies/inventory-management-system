const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { sendWeMissYouEmail } = require('../utils/mailer');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbPath = path.join(__dirname, '../inventory.db');

async function main() {
  console.log('--- Flywheel Technologies: Admin Re-engagement Dispatcher ---');
  
  // 1. Fetch admins from local SQLite database
  const db = new sqlite3.Database(dbPath);
  const sqliteAdmins = await new Promise((resolve, reject) => {
    db.all("SELECT id, email, full_name, role FROM users WHERE role = 'admin'", (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  db.close();

  // Known system admin emails
  const knownSystemAdmins = [
    { email: 'admin@florzyangel.com', full_name: 'Angel' },
    { email: 'florzyangel1@gmail.com', full_name: 'System Admin' },
    { email: 'godwinokro2020@gmail.com', full_name: 'Godwin Okro' }
  ];

  // Merge list of admin emails
  const adminMap = new Map();
  for (const admin of knownSystemAdmins) {
    if (admin.email) adminMap.set(admin.email.toLowerCase(), admin.full_name || 'Admin');
  }
  for (const admin of sqliteAdmins) {
    if (admin.email) adminMap.set(admin.email.toLowerCase(), admin.full_name || 'Admin');
  }

  const admins = Array.from(adminMap.entries()).map(([email, name]) => ({ email, name }));

  console.log(`Found ${admins.length} admin(s) in system:`);
  admins.forEach(a => console.log(`  - ${a.name} <${a.email}>`));

  // 2. Render and save preview artifact HTML
  const artifactDir = path.join('C:', 'Users', 'gokro', '.gemini', 'antigravity-ide', 'brain', '781b0a24-a8cb-48bd-8a12-a304b8fa010e');
  const previewPath = path.join(artifactDir, 'admin_email_template.html');

  // Grab the HTML structure by calling a dummy invocation or rendering
  const testEmail = admins[0] || { email: 'admin@florzyangel.com', name: 'Admin' };
  
  console.log('\nDispatching re-engagement email...');
  const resendApiKey = process.env.RESEND_API_KEY;
  const isRealKey = resendApiKey && !resendApiKey.includes('your_api_key_here');

  for (const admin of admins) {
    if (isRealKey) {
      console.log(`Sending live email via Resend to ${admin.email}...`);
      const result = await sendWeMissYouEmail(admin.email, admin.name);
      console.log(`Result for ${admin.email}:`, result);
    } else {
      console.log(`[Preview Mode] Prepared email for ${admin.email} (RESEND_API_KEY is not configured yet).`);
    }
  }

  if (!isRealKey) {
    console.log('\nℹ️ Note: RESEND_API_KEY in server/.env is set to a placeholder.');
    console.log('To deliver real emails to recipients\' inboxes, set a valid RESEND_API_KEY in server/.env.');
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
