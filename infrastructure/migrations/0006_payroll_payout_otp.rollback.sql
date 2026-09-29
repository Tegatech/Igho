-- Igho M5 follow-up — remove transfer OTP state
update public.payroll_payouts
set status = 'pending'
where status = 'otp';

alter table public.payroll_payouts
  drop constraint if exists payroll_payouts_status_check;

alter table public.payroll_payouts
  add constraint payroll_payouts_status_check
  check (status in ('queued','pending','success','failed','reversed'));
