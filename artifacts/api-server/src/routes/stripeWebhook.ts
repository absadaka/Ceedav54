import type { Request, Response } from "express";
import { db, invoicesTable, paymentsTable } from "@workspace/db";
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
            updated_at: new Date(),
          }).where(eq(invoicesTable.id, invoiceId));

          await db.insert(paymentsTable).values({
            tenant_id: inv.tenant_id,
            invoice_id: inv.id,
            method: "card",
            amount: amountPaid,
            reference: session.payment_intent ?? session.id,
            notes: `Stripe checkout session ${session.id}`,
            paid_at: new Date(),
          });

          console.log(`[stripe-webhook] Invoice ${inv.ref} marked as paid (${amountPaid})`);
        }
      }
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook] Error:", err.message);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
