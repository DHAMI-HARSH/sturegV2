import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

type MailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendMail({ to, subject, html }: MailInput) {
  return resend.emails.send({
    from: env.MAIL_FROM,
    to,
    subject,
    html,
  });
}

export function approvalEmail(studentNameOrDd: string) {
  return {
    subject: "Student Registration Approved",
    html: `
      <p>Hello ${studentNameOrDd},</p>
      <p>Your fee receipt has been approved. You can now complete your registration form.</p>
      <p>Visit the student portal and continue from the registration step.</p>
    `,
  };
}

export function rejectionEmail(studentNameOrDd: string, reason: string) {
  return {
    subject: "Student Registration Rejected",
    html: `
      <p>Hello ${studentNameOrDd},</p>
      <p>Your fee receipt submission was rejected.</p>
      <p>Reason: ${reason}</p>
      <p>Please log in again and upload a valid current semester fee receipt.</p>
    `,
  };
}

export function studentAccountEmail(ddNumber: string, temporaryPassword: string) {
  return {
    subject: "Your Student Portal Account",
    html: `
      <p>Your student account has been created.</p>
      <p>DD Number: <strong>${ddNumber}</strong></p>
      <p>Temporary Password: <strong>${temporaryPassword}</strong></p>
      <p>You will be asked to change this password on first login.</p>
    `,
  };
}

export function passwordResetEmail(ddNumber: string, temporaryPassword: string) {
  return {
    subject: "Student Portal Password Reset",
    html: `
      <p>Your student portal password has been reset.</p>
      <p>DD Number: <strong>${ddNumber}</strong></p>
      <p>Temporary Password: <strong>${temporaryPassword}</strong></p>
      <p>Please sign in and change it immediately.</p>
    `,
  };
}
