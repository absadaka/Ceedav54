-- Per-event notification toggles (which events fire on which channel)
ALTER TABLE "tenant_settings"
  ADD COLUMN IF NOT EXISTS "notifications" jsonb NOT NULL DEFAULT '{
    "booking_confirmation": { "email": true,  "sms": false, "whatsapp": true  },
    "job_status":           { "email": false, "sms": false, "whatsapp": true  },
    "invoice":              { "email": true,  "sms": false, "whatsapp": true  },
    "quote":                { "email": true,  "sms": false, "whatsapp": true  },
    "reminder":             { "email": true,  "sms": false, "whatsapp": false }
  }'::jsonb;

-- Outbound message log (email / sms / whatsapp)
CREATE TABLE IF NOT EXISTS "customer_messages" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"           uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "client_id"           uuid REFERENCES "clients"("id") ON DELETE SET NULL,
  "channel"             text NOT NULL,        -- 'email' | 'sms' | 'whatsapp'
  "direction"           text NOT NULL DEFAULT 'outbound',
  "event"               text,                 -- 'booking_confirmation' | 'job_status' | 'invoice' | 'quote' | 'reminder' | 'manual'
  "to_address"          text NOT NULL,
  "subject"             text,
  "body"                text,
  "status"              text NOT NULL,        -- 'sent' | 'failed' | 'skipped'
  "provider_message_id" text,
  "error"               text,
  "related_type"        text,                 -- 'booking' | 'quotation' | 'invoice' | 'job'
  "related_id"          uuid,
  "sent_by_user_id"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "customer_messages_tenant_idx"  ON "customer_messages"("tenant_id");
CREATE INDEX IF NOT EXISTS "customer_messages_client_idx"  ON "customer_messages"("client_id");
CREATE INDEX IF NOT EXISTS "customer_messages_related_idx" ON "customer_messages"("related_type", "related_id");
CREATE INDEX IF NOT EXISTS "customer_messages_created_idx" ON "customer_messages"("created_at" DESC);
