import type { Request, Response } from "express";
import { db, invoicesTable, paymentsTable, jobsTable, quotationsTable, quoteAdvancePaymentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUncachableStripeClient } from "../services/stripeClient.js";

export async function handleStripeWebhook(req: Request, res: Response) {
  try {
    const stripe = await getUncachableStripeClient();
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting request");
      return res.status(500).json({ error: "Webhook not configured" });
    }

    if (!sig) {
      console.error("[stripe-webhook] Missing stripe-signature header");
      return res.status(400).json({ error: "Missing signature" });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error("[stripe-webhook] Signature verification failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metaType = session.metadata?.type;

      if (metaType === "advance_payment") {
        const quotationId = session.metadata?.quotation_id;
        if (quotationId) {
          const [qt] = await db.select()
            .from(quotationsTable)
            .where(and(
              eq(quotationsTable.id, quotationId),
              eq(quotationsTable.advance_stripe_session_id, session.id),
            )).limit(1);

          if (qt && qt.advance_paid !== "true") {
            const amountPaid = ((session.amount_total ?? 0) / 100).toFixed(2);
            const now = new Date();

            await db.update(quotationsTable).set({
              advance_paid: "true",
              advance_paid_at: now,
              advance_stripe_url: null,
              updated_at: now,
            }).where(eq(quotationsTable.id, quotationId));

            await db.insert(quoteAdvancePaymentsTable).values({
              quotation_id: quotationId,
              tenant_id: qt.tenant_id,
              amount: amountPaid,
              method: "card",
              reference: (session as any).payment_intent ?? session.id,
              note: `Stripe advance payment — session ${session.id}`,
              paid_at: now,
            });

            console.log(`[stripe-webhook] Quotation ${qt.ref} advance payment received (${amountPaid})`);
          }
        }
      } else {
        const invoiceId = session.metadata?.invoice_id;

        if (invoiceId) {
          const [inv] = await db.select().from(invoicesTable)
            .where(and(
              eq(invoicesTable.id, invoiceId),
              eq(invoicesTable.stripe_session_id, session.id),
            )).limit(1);

          if (inv && inv.status !== "paid") {
            const amountPaid = ((session.amount_total ?? 0) / 100).toFixed(2);

            await db.update(invoicesTable).set({
              status: "paid",
              paid_amount: amountPaid,
              paid_at: new Date(),
              stripe_payment_url: null,
              updated_at: new Date(),
            }).where(eq(invoicesTable.id, invoiceId));

            await db.insert(paymentsTable).values({
              tenant_id: inv.tenant_id,
              invoice_id: inv.id,
              method: "card",
              amount: amountPaid,
              reference: (session as any).payment_intent ?? session.id,
              notes: `Stripe checkout session ${session.id}`,
              paid_at: new Date(),
            });

            if (inv.job_id) {
              const [job] = await db.select({ status: jobsTable.status })
                .from(jobsTable)
                .where(eq(jobsTable.id, inv.job_id))
                .limit(1);

              if (job && job.status === "invoiced") {
                await db.update(jobsTable).set({
                  status: "paid",
                  updated_at: new Date(),
                }).where(eq(jobsTable.id, inv.job_id));
                console.log(`[stripe-webhook] Job ${inv.job_id} moved to "paid"`);
              }
            }

            console.log(`[stripe-webhook] Invoice ${inv.ref} marked as paid (${amountPaid})`);
          }
        }
      }
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook] Error:", err.message);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
