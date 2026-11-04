-- Prevent duplicate ledger entries when Yoco redelivers a payment event.
create unique index if not exists payments_yoco_transaction_id_uidx
  on public.payments (transaction_id)
  where gateway = 'yoco' and transaction_id is not null;
