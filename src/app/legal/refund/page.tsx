import type { Metadata } from "next";
import { H2, P, UL } from "../Prose";

export const metadata: Metadata = { title: "Refund Policy | ProcurePro" };

const EFFECTIVE_DATE = "26 August 2026";

export default function RefundPage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Refund Policy</h1>
      <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">Effective {EFFECTIVE_DATE}</p>

      <H2>Try before you pay</H2>
      <P>
        Every organization gets a 14-day free trial with full access to ProcurePro, and no card is required to start
        it. Use the trial to evaluate whether ProcurePro fits your team before any payment is taken.
      </P>

      <H2>Monthly subscription</H2>
      <P>
        ProcurePro is billed monthly in advance, at a flat ₦25,000 per organization. Because the trial exists
        specifically so you can decide before paying, completed monthly charges are non-refundable, including for
        partial months if you cancel partway through a billing period — your access simply continues until the end
        of the period you already paid for, and does not renew afterward.
      </P>

      <H2>When we do refund</H2>
      <P>We&rsquo;ll issue a refund if:</P>
      <UL>
        <li>You were charged in error — for example, charged more than once for the same billing period, or charged after a cancellation that should have taken effect.</li>
        <li>A payment failure on our or Paystack&rsquo;s side caused an incorrect charge.</li>
      </UL>
      <P>
        To request one, email us within 30 days of the charge with your organization name and the transaction date.
        We&rsquo;ll investigate and, where a billing error is confirmed, refund it to the original payment method
        within a reasonable time.
      </P>

      <H2>Canceling your subscription</H2>
      <P>
        You can cancel any time from the Billing page inside ProcurePro — there&rsquo;s no cancellation fee and no
        need to contact us first. Canceling stops the next renewal; it does not retroactively refund the current
        period.
      </P>

      <H2>Vendor payments</H2>
      <P>
        Vendor payouts you initiate through ProcurePro (via Paystack or Flutterwave transfer) are a separate
        transaction between your organization and your vendor&rsquo;s bank account — this Refund Policy covers your
        ProcurePro subscription only. If a vendor transfer fails or is sent in error, it&rsquo;s handled directly with
        your payment provider and the receiving bank, the same as any bank transfer.
      </P>

      <H2>Contact</H2>
      <P>
        For a billing question or refund request, email{" "}
        <a href="mailto:den.kobbis@gmail.com" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          den.kobbis@gmail.com
        </a>
        .
      </P>
    </article>
  );
}
