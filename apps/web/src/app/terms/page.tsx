import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, supportEmail } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  const email = supportEmail();
  return (
    <LegalPage title="Terms of service">
      <p>By creating an account or using DesiConnect USA, you agree to these terms. If you don&apos;t agree, please don&apos;t use DesiConnect.</p>

      <h2>What DesiConnect is</h2>
      <p>
        DesiConnect is a directory and marketplace that connects people with businesses, events, jobs and housing. We aren&apos;t a party to
        anything you arrange with a provider, employer or landlord, and we don&apos;t guarantee them. &ldquo;Verified&rdquo; means we reviewed the
        documents a business gave us. It isn&apos;t an endorsement.
      </p>
      <p>DesiConnect doesn&apos;t give legal, immigration, tax, insurance or medical advice. Desi AI answers are general information and can be wrong, so check anything important with a qualified professional.</p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 18 years old.</li>
        <li>Give accurate information, keep your sign-in secure, and tell us if you think someone else has used your account.</li>
        <li>If you sign in with Google, Facebook or X, that service&apos;s terms also apply to your use of it.</li>
      </ul>

      <h2>What you post</h2>
      <ul>
        <li>You&apos;re responsible for listings, reviews, messages and files you post, and you must have the right to post them.</li>
        <li>No false, misleading, discriminatory, hateful, sexual, illegal or spam content, and no listings for businesses you don&apos;t run.</li>
        <li>Housing and job listings must follow fair housing and equal employment laws.</li>
        <li>
          You let us display, store and moderate what you post so DesiConnect can work. We may remove content or suspend accounts that break these
          terms.
        </li>
      </ul>

      <h2>Businesses</h2>
      <p>
        Businesses must hold the licenses their work requires and keep their listings accurate. Claims of directory listings are checked before
        approval. A business can lose its listings for misrepresenting itself.
      </p>

      <h2>Limits on liability</h2>
      <p>
        DesiConnect is provided &ldquo;as is&rdquo;. To the extent the law allows, we aren&apos;t liable for indirect or consequential losses, or for
        what providers, employers, landlords or other members do.
      </p>

      <h2>Ending your account</h2>
      <p>You can delete your account at any time (see <Link href="/data-deletion">how to delete your data</Link>). We may close accounts that break these terms.</p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms and will post changes here. These terms are governed by the laws of the State of Texas. Questions:{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </LegalPage>
  );
}
