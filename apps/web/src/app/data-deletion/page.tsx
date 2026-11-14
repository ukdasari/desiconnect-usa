import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, supportEmail } from "@/components/legal-page";

export const metadata: Metadata = { title: "Delete your data" };

/** Data deletion instructions (also the "User data deletion" URL for the Facebook and X sign-in apps). */
export default function DataDeletionPage() {
  const email = supportEmail();
  return (
    <LegalPage title="How to delete your data">
      <p>You can delete your 1StopDesi account and personal data yourself at any time, including if you signed up with Google, Facebook or X.</p>

      <h2>On the website</h2>
      <ul>
        <li>Sign in and open your <Link href="/account#delete-account">account page</Link>.</li>
        <li>Scroll to <strong>Delete your account</strong>, type DELETE to confirm, and select <strong>Delete my account</strong>.</li>
      </ul>

      <h2>In the app</h2>
      <ul>
        <li>Go to <strong>Profile</strong> and tap <strong>Delete account</strong>.</li>
      </ul>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your name, email, phone and location, and your sign-in (password or the link to Google, Facebook or X).</li>
        <li>Requests, job applications and uploaded resumes, RSVPs, saved listings, alerts, notifications and Desi AI history.</li>
        <li>Your business profile and listings, if you have them, and uploaded license documents.</li>
      </ul>
      <p>
        Reviews you wrote stay up without your name. Security logs are kept for a limited time, and backups roll off within 14 days.
      </p>

      <h2>Can&apos;t sign in?</h2>
      <p>
        Email <a href={`mailto:${email}`}>{email}</a> from the address on your account and we&apos;ll delete it for you, usually within 7 days.
        To also remove 1StopDesi from your Google, Facebook or X account, remove it in that service&apos;s connected apps settings.
      </p>
    </LegalPage>
  );
}
