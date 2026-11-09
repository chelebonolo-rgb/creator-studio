import Subscriber from '../models/Subscriber.js';
import Notification from '../models/Notification.js';

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, text }) {
  if (!isEmailConfigured()) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(`Email delivery failed (${response.status}): ${result.message || response.statusText}`);
  }
  return true;
}

export async function notifyCreator({ creatorId, contentId, type, message, emailSubject }) {
  await Notification.create({ creator: creatorId, content: contentId, type, message });
  if (!isEmailConfigured() || !process.env.CREATOR_EMAIL) {
    if (!isEmailConfigured()) console.warn('Creator email alert not sent: configure RESEND_API_KEY and EMAIL_FROM.');
    return;
  }
  try {
    await sendEmail({ to: process.env.CREATOR_EMAIL, subject: emailSubject, text: message });
  } catch (error) {
    console.error('Creator notification email failed:', error.message);
  }
}

export async function sendPublishedUpdate(content) {
  if (!isEmailConfigured()) {
    console.warn('Subscriber update emails not sent: configure RESEND_API_KEY and EMAIL_FROM.');
    return;
  }
  const subscribers = await Subscriber.find({ active: true }).select('email').limit(1000).lean();
  for (const subscriber of subscribers) {
    try {
      await sendEmail({
        to: subscriber.email,
        subject: `New from ${process.env.CREATOR_NAME || 'your creator'}: ${content.title}`,
        text: `${content.title}\n\n${content.description}\n\nRead more: ${process.env.PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'}/content/${content._id}`,
      });
    } catch (error) {
      console.error(`Subscriber update email failed for ${subscriber.email}:`, error.message);
    }
  }
}
