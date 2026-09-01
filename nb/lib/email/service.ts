import { Resend } from 'resend';
import { env } from '@/lib/env';

// Initialize Resend with API Key from env
const resend = new Resend(env.RESEND_API_KEY || 're_123456789'); // Fallback for build time type safety

export const emailService = {
  /**
   * Send an email using Resend
   * @param to Recipient email
   * @param subject Email subject
   * @param react React Email template component
   */
  send: async ({ to, subject, react }: { to: string; subject: string; react: React.ReactNode }) => {
    if (!env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY is missing. Email not sent:', subject);
      return { success: false, error: 'Missing API Key' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'NB <onboarding@resend.dev>', // Update this with your verified domain in production (e.g. notifications@yourdomain.com)
        to,
        subject,
        react,
      });

      if (error) {
        console.error('Email Error:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (e) {
      console.error('Email Exception:', e);
      return { success: false, error: e };
    }
  }
};
