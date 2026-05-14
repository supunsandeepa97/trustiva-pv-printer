const nodemailer = require('nodemailer');

function createTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendSignupRequestEmail(applicant) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const transporter = createTransport();

  if (!transporter || !adminEmail) {
    console.log(`[SIGNUP REQUEST] New pending user: ${applicant.name} <${applicant.email}> (role: ${applicant.role})`);
    return;
  }

  const roleLabel = applicant.role.replace(/_/g, ' ');
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#0F172A;padding:20px 24px">
        <h2 style="color:#C9A227;margin:0;font-size:18px">TRUSTIVA PRINT SUITE</h2>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">New Access Request</p>
      </div>
      <div style="padding:24px">
        <p style="color:#374151;margin:0 0 16px">A new user has requested access to Trustiva Print Suite:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#6b7280;width:100px">Name</td><td style="padding:8px 0;color:#111827;font-weight:600">${applicant.name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0;color:#111827">${applicant.email}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Role</td><td style="padding:8px 0;color:#111827;text-transform:capitalize">${roleLabel}</td></tr>
          ${applicant.message ? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">Message</td><td style="padding:8px 0;color:#111827;font-style:italic">${applicant.message}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #C9A227">
          <p style="margin:0;font-size:13px;color:#92400e">Log in to <strong>Settings → User Management → Pending Requests</strong> to approve or reject this request.</p>
        </div>
      </div>
      <div style="padding:12px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
        Trustiva Print Suite · Automated notification
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Trustiva Print Suite" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[Trustiva] New Access Request — ${applicant.name}`,
      html,
    });
  } catch (err) {
    console.error('[MAILER] Failed to send signup notification:', err.message);
    console.log(`[SIGNUP REQUEST] New pending user: ${applicant.name} <${applicant.email}>`);
  }
}

module.exports = { sendSignupRequestEmail };
