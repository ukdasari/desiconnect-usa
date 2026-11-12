import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, supportEmail } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  const email = supportEmail();
  return (
    <LegalPage title="Privacy policy">
      <p>
        DesiConnect USA (&ldquo;DesiConnect&rdquo;, &ldquo;we&rdquo;) runs a community directory and marketplace for Indians and South Asians in
        the United States. This policy explains what we collect, why, and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name and email address, and optionally your phone number, city, state and ZIP code.</li>
        <li>
          <strong>Sign-in:</strong> if you register with a password, we store only a one-way hash of it. If you continue with Google, Facebook or X,
          we receive your name, email address and an account ID from that service. We don&apos;t receive your password there, and we don&apos;t
          post anything on your behalf.
        </li>
        <li><strong>What you do on DesiConnect:</strong> requests you send to providers, job applications and the resumes you upload, event RSVPs, saved listings, alerts, reviews, reports and Desi AI conversations.</li>
        <li><strong>Businesses:</strong> business profile details, listings, and license or credential documents you upload for verification.</li>
        <li><strong>Technical data:</strong> IP address and basic request logs, used for security, rate limiting and fixing problems.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account and the features you use, such as delivering your request to a provider or your application to an employer.</li>
        <li>To send the notifications and alerts you choose (in the app, by email or by phone notification).</li>
        <li>To keep DesiConnect safe: moderating listings and reviews, verifying businesses, and preventing abuse.</li>
      </ul>
      <p>We don&apos;t sell your personal information, and we don&apos;t use it for third-party advertising.</p>

      <h2>When we share it</h2>
      <ul>
        <li><strong>With a provider or employer, only when you contact them.</strong> Your contact details go to them only when you send a request, apply or RSVP.</li>
        <li><strong>With service providers that run DesiConnect for us:</strong> cloud hosting and storage (Google Cloud), email delivery, phone notifications and, if you use Desi AI, an AI model provider. They may use the data only to provide their service to us.</li>
        <li><strong>When the law requires it,</strong> or to protect people from harm.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Edit your details on your <Link href="/account">account page</Link>.</li>
        <li>Turn alert emails and phone notifications on or off on the <Link href="/account/alerts">Alerts page</Link>. Every alert email has an unsubscribe link.</li>
        <li>Delete your Desi AI history from your account page.</li>
        <li>Delete your account at any time. See <Link href="/data-deletion">how to delete your data</Link>.</li>
      </ul>

      <h2>Keeping it safe</h2>
      <p>
        Data is stored in the United States on Google Cloud, encrypted in transit and at rest. Uploaded documents are kept in private storage that
        only DesiConnect can access. Backups are kept for 14 days.
      </p>

      <h2>Children</h2>
      <p>DesiConnect is for adults. We don&apos;t knowingly collect information from children under 13.</p>

      <h2>Changes and contact</h2>
      <p>
        We&apos;ll post any changes here and update the date above. Questions or requests: <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </LegalPage>
  );
}
