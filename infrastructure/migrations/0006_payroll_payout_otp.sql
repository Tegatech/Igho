-- Igho M5 follow-up — Paystack transfer OTP state

alter table public.payroll_payouts
  drop constraint if exists payroll_payouts_status_check;

alter table public.payroll_payouts
  add constraint payroll_payouts_status_check
  check (status in ('queued','otp','pending','success','failed','reversed'));
