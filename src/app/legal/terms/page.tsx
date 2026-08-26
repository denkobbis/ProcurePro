import type { Metadata } from "next";
import { H2, P, UL } from "../Prose";

export const metadata: Metadata = { title: "Terms of Service | ProcurePro" };

const EFFECTIVE_DATE = "26 August 2026";

export default function TermsPage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Terms of Service</h1>
      <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">Effective {EFFECTIVE_DATE}</p>

      <P>
        These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of ProcurePro (&ldquo;ProcurePro,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us&rdquo;), a procurement management platform for oil &amp; gas and heavy-industry
        businesses in Nigeria. ProcurePro is currently operated as a trading name pending formal company
        incorporation in Nigeria; until incorporation is complete, references in these Terms to &ldquo;we&rdquo; or
        &ldquo;us&rdquo; mean the individual(s) operating ProcurePro. By creating an account or using ProcurePro, you
        agree to these Terms on behalf of yourself and the organization you represent.
      </P>

      <H2>1. The service</H2>
      <P>
        ProcurePro is a requisition-to-payment procurement platform: purchase requests, multi-step approvals, vendor
        RFQs, purchase orders, shipping/customs tracking, budgets, and audit logging, delivered as a hosted,
        multi-tenant web application. Each customer organization&rsquo;s data is logically isolated from every other
        organization&rsquo;s data.
      </P>

      <H2>2. Accounts and organizations</H2>
      <P>
        The person who creates an organization becomes its first administrator and is responsible for inviting and
        managing other users, assigning roles, and keeping account credentials secure. You must provide accurate
        information when creating an account and promptly update it if it changes. You&rsquo;re responsible for all
        activity that happens under your account.
      </P>

      <H2>3. Subscription, billing, and trial</H2>
      <UL>
        <li>ProcurePro is billed at a flat ₦25,000 per month per organization, with a 14-day free trial that does not require a card up front.</li>
        <li>Paid subscriptions are processed by Paystack. ProcurePro never collects or stores your full card details — Paystack&rsquo;s hosted checkout handles payment directly.</li>
        <li>Subscriptions renew automatically each month until canceled. You can cancel at any time from the Billing page; cancellation takes effect at the end of the current billing period.</li>
        <li>If a trial ends without a subscription, or a subscription payment fails or lapses, the organization&rsquo;s account is placed into a read-only state: existing data remains visible, but new requests, approvals, purchase orders, and other changes are blocked until the account is brought current.</li>
        <li>See our <a href="/legal/refund" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">Refund Policy</a> for how refunds and billing disputes are handled.</li>
      </UL>

      <H2>4. Vendor payments</H2>
      <P>
        ProcurePro optionally lets an organization pay its own vendors directly from the app, using Paystack or
        Flutterwave transfer APIs against bank details the organization enters and verifies itself. ProcurePro does
        not hold customer or vendor funds at any point — money moves directly between the organization&rsquo;s
        connected payment provider and the vendor&rsquo;s bank account. The organization is solely responsible for
        the accuracy of vendor bank details and for any transfer it authorizes.
      </P>

      <H2>5. Your data</H2>
      <P>
        You and your organization own the procurement, vendor, and financial data you put into ProcurePro. We access
        it only to operate, secure, and support the service, or as required by law. See our{" "}
        <a href="/legal/privacy" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          Privacy Policy
        </a>{" "}
        for how data is handled. If you cancel or your account is terminated, we retain your data for a reasonable
        period to allow export or reactivation before deletion.
      </P>

      <H2>6. Acceptable use</H2>
      <P>You agree not to:</P>
      <UL>
        <li>Use ProcurePro for any unlawful purpose, or to process fraudulent transactions or fraudulent vendor payments.</li>
        <li>Attempt to access another organization&rsquo;s data, bypass access controls, or probe, scan, or test the vulnerability of the platform without authorization.</li>
        <li>Reverse-engineer, resell, or white-label the platform without our written agreement.</li>
        <li>Upload malicious code or use the service in a way that disrupts its operation for other customers.</li>
      </UL>

      <H2>7. Service availability</H2>
      <P>
        We aim to keep ProcurePro available and reliable, but the service is provided on an &ldquo;as is&rdquo; and
        &ldquo;as available&rdquo; basis, without warranties of any kind, express or implied. We do not guarantee
        uninterrupted or error-free operation, and we may perform maintenance, updates, or changes to the service from
        time to time.
      </P>

      <H2>8. Limitation of liability</H2>
      <P>
        To the fullest extent permitted by law, ProcurePro and its operator(s) are not liable for indirect,
        incidental, or consequential damages arising from your use of the service, including loss of profits, data,
        or business opportunity. Nothing in these Terms limits liability for fraud or for anything that cannot
        lawfully be limited or excluded under Nigerian law.
      </P>

      <H2>9. Termination</H2>
      <P>
        You may stop using ProcurePro and cancel your subscription at any time. We may suspend or terminate an
        account that violates these Terms, engages in fraudulent activity, or has an unresolved billing failure for
        an extended period, after reasonable notice where practical.
      </P>

      <H2>10. Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time as the product or our business changes. If we make material
        changes, we&rsquo;ll update the effective date above and, where appropriate, notify account administrators.
        Continued use of ProcurePro after a change takes effect means you accept the updated Terms.
      </P>

      <H2>11. Governing law</H2>
      <P>These Terms are governed by the laws of the Federal Republic of Nigeria.</P>

      <H2>12. Contact</H2>
      <P>
        Questions about these Terms can be sent to{" "}
        <a href="mailto:den.kobbis@gmail.com" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          den.kobbis@gmail.com
        </a>
        .
      </P>
    </article>
  );
}
