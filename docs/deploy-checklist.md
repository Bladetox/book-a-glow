# Deploy Checklist

## Supabase

### 1. Run migration
```
supabase db push
```
Or apply `supabase/migrations/20260310220000_feature_tenant_secrets.sql` in the Supabase SQL editor.

### 2. Deploy edge functions
```
supabase functions deploy yoco-checkout
supabase functions deploy yoco-webhook
supabase functions deploy places-autocomplete
supabase functions deploy send-booking-email
```

### 3. Set edge function secrets (Supabase Dashboard → Project Settings → Edge Functions)
```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### 4. Admin: save tenant secrets (Admin → Integrations tab)
- Yoco Secret Key (`sk_live_...`)
- Yoco Webhook Secret (`whsec_...`)
- Google Places API Key (`AIza...`)

### 5. Configure Yoco webhook
In Yoco Portal → Developers → Webhooks, add:
```
https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/yoco-webhook
```
Subscribe to: `payment.succeeded`, `payment.failed`

### 6. Verify Resend domain
In Resend → Domains → nextslot.co.za, ensure all DNS records are verified (MX, SPF, DKIM).

---

## Vercel
No new env vars needed. All secrets are in Supabase.

---

## Testing flow
1. Go to `/{tenant}/book`
2. Select services → pick date/time → fill details (address autocomplete should appear)
3. Review page → click **Confirm & Pay Deposit**
4. Should redirect to Yoco payment page
5. After payment, Yoco sends webhook → booking status → `confirmed`
6. Client receives confirmation email from `team@nextslot.co.za`
7. Business owner receives admin notification
