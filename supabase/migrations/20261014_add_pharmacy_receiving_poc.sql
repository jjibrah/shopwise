-- Demo-only pharmacy receiving. Apply after database.sql. Never changes POS inventory.
begin;
create table public.pharmacy_receipts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  created_by uuid not null references public.users(id) on delete restrict,
  request_id uuid not null,
  supplier text not null check (length(btrim(supplier)) between 1 and 160),
  delivery_reference text not null check (length(btrim(delivery_reference)) between 1 and 100),
  medicine text not null check (length(btrim(medicine)) between 1 and 160),
  product_code text not null check (length(btrim(product_code)) between 1 and 80),
  batch_number text not null check (length(btrim(batch_number)) between 1 and 80),
  printed_expiry date not null,
  quantity integer not null check (quantity between 1 and 1000000),
  unit text not null check (length(btrim(unit)) between 1 and 40),
  source text not null default 'demo' check (source = 'demo'),
  outcome text not null default 'unchecked' check (outcome in ('unchecked','matched','mismatch','recalled','expired','not_found','unavailable')),
  latest_evidence jsonb,
  decision text not null default 'pending' check (decision in ('pending','accepted','quarantined','rejected')),
  decision_reason text,
  physical_inspection boolean not null default false,
  decided_by uuid references public.users(id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, request_id)
);
create table public.pharmacy_verifications (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.pharmacy_receipts(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  checked_by uuid not null references public.users(id) on delete restrict,
  request_id uuid not null,
  attempt_number integer not null check (attempt_number > 0),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object' and evidence->>'source' = 'demo'),
  created_at timestamptz not null default now(),
  unique (receipt_id, request_id), unique (receipt_id, attempt_number)
);
create trigger pharmacy_verifications_are_immutable before update or delete on public.pharmacy_verifications for each row execute function public.prevent_immutable_ledger_change();
create index pharmacy_receipts_shop_created on public.pharmacy_receipts(shop_id, created_at desc);
create index pharmacy_verifications_receipt on public.pharmacy_verifications(receipt_id, attempt_number);
alter table public.pharmacy_receipts enable row level security;
alter table public.pharmacy_verifications enable row level security;
create policy pharmacy_receipts_owner_read on public.pharmacy_receipts for select to authenticated using (public.is_shop_owner(shop_id, auth.uid()));
create policy pharmacy_verifications_owner_read on public.pharmacy_verifications for select to authenticated using (public.is_shop_owner(shop_id, auth.uid()));
revoke all on public.pharmacy_receipts, public.pharmacy_verifications from anon, authenticated;
grant select on public.pharmacy_receipts, public.pharmacy_verifications to authenticated;
grant all on public.pharmacy_receipts, public.pharmacy_verifications to service_role;

create function public.create_pharmacy_receipt(p_shop_id uuid, p_input jsonb)
returns public.pharmacy_receipts language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_result public.pharmacy_receipts; v_existing jsonb;
begin
  if not public.is_shop_owner(p_shop_id, auth.uid()) then raise exception 'Owner access required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_shop_id::text || (p_input->>'request_id'), 0));
  select * into v_result from public.pharmacy_receipts where shop_id=p_shop_id and request_id=(p_input->>'request_id')::uuid;
  if found then
    v_existing := jsonb_build_object('request_id',v_result.request_id,'supplier',v_result.supplier,'delivery_reference',v_result.delivery_reference,'medicine',v_result.medicine,'product_code',v_result.product_code,'batch_number',v_result.batch_number,'printed_expiry',v_result.printed_expiry,'quantity',v_result.quantity,'unit',v_result.unit);
    if v_existing <> p_input then raise exception 'PHARMACY_CONFLICT: request identifier reused with different delivery'; end if;
    return v_result;
  end if;
  insert into public.pharmacy_receipts(shop_id,created_by,request_id,supplier,delivery_reference,medicine,product_code,batch_number,printed_expiry,quantity,unit)
  values(p_shop_id,auth.uid(),(p_input->>'request_id')::uuid,p_input->>'supplier',p_input->>'delivery_reference',p_input->>'medicine',p_input->>'product_code',p_input->>'batch_number',(p_input->>'printed_expiry')::date,(p_input->>'quantity')::integer,p_input->>'unit') returning * into v_result;
  insert into public.audit_logs(shop_id,user_id,action,table_name,record_id,new_values) values(p_shop_id,auth.uid(),'PHARMACY_RECEIVED','pharmacy_receipts',v_result.id,to_jsonb(v_result));
  return v_result;
end; $$;

create function public.record_pharmacy_verification(p_shop_id uuid,p_receipt_id uuid,p_actor_id uuid,p_request_id uuid,p_attempt_number integer,p_evidence jsonb)
returns public.pharmacy_receipts language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_result public.pharmacy_receipts; v_next integer;
begin
  if not public.is_shop_owner(p_shop_id,p_actor_id) then raise exception 'Owner access required' using errcode='42501'; end if;
  select * into v_result from public.pharmacy_receipts where id=p_receipt_id and shop_id=p_shop_id for update;
  if not found then raise exception 'PHARMACY_NOT_FOUND'; end if;
  if exists(select 1 from public.pharmacy_verifications where receipt_id=p_receipt_id and request_id=p_request_id) then return v_result; end if;
  if v_result.decision <> 'pending' then raise exception 'PHARMACY_CONFLICT: delivery finalized'; end if;
  select coalesce(max(attempt_number),0)+1 into v_next from public.pharmacy_verifications where receipt_id=p_receipt_id;
  if p_attempt_number is distinct from v_next then raise exception 'PHARMACY_CONFLICT: concurrent verification'; end if;
  if p_evidence->>'source' is distinct from 'demo' or p_evidence->>'outcome' is null or p_evidence->>'outcome' not in ('matched','mismatch','recalled','expired','not_found','unavailable') then raise exception 'PHARMACY_CONFLICT: unsupported verification'; end if;
  insert into public.pharmacy_verifications(receipt_id,shop_id,checked_by,request_id,attempt_number,evidence) values(p_receipt_id,p_shop_id,p_actor_id,p_request_id,v_next,p_evidence);
  update public.pharmacy_receipts set outcome=p_evidence->>'outcome',latest_evidence=p_evidence,updated_at=now() where id=p_receipt_id returning * into v_result;
  insert into public.audit_logs(shop_id,user_id,action,table_name,record_id,new_values) values(p_shop_id,p_actor_id,'PHARMACY_CHECKED','pharmacy_receipts',p_receipt_id,p_evidence);
  return v_result;
end; $$;

create function public.decide_pharmacy_receipt(p_receipt_id uuid,p_decision text,p_reason text,p_physical_inspection boolean)
returns public.pharmacy_receipts language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_result public.pharmacy_receipts;
begin
  select * into v_result from public.pharmacy_receipts where id=p_receipt_id for update;
  if not found then raise exception 'PHARMACY_NOT_FOUND'; end if;
  if not public.is_shop_owner(v_result.shop_id,auth.uid()) then raise exception 'Owner access required' using errcode='42501'; end if;
  if p_decision is null or p_decision not in ('accepted','quarantined','rejected') or p_reason is null or length(btrim(p_reason)) not between 5 and 1000 or p_physical_inspection is null then raise exception 'PHARMACY_CONFLICT: invalid decision'; end if;
  if v_result.decision <> 'pending' then
    if v_result.decision=p_decision and v_result.decision_reason=btrim(p_reason) and v_result.physical_inspection=p_physical_inspection then return v_result; end if;
    raise exception 'PHARMACY_CONFLICT: decision is final';
  end if;
  if p_decision='accepted' and (v_result.outcome <> 'matched' or not p_physical_inspection or v_result.printed_expiry <= (now() at time zone 'Africa/Nairobi')::date or v_result.latest_evidence is null or coalesce((v_result.latest_evidence->>'checkedAt')::timestamptz < now()-interval '15 minutes',true) or (v_result.latest_evidence->>'checkedAt')::timestamptz > now()+interval '1 minute') then raise exception 'PHARMACY_CONFLICT: acceptance requires a recent match, unexpired batch and physical inspection'; end if;
  update public.pharmacy_receipts set decision=p_decision,decision_reason=btrim(p_reason),physical_inspection=p_physical_inspection,decided_by=auth.uid(),decided_at=now(),updated_at=now() where id=p_receipt_id returning * into v_result;
  insert into public.audit_logs(shop_id,user_id,action,table_name,record_id,new_values) values(v_result.shop_id,auth.uid(),'PHARMACY_DECIDED','pharmacy_receipts',p_receipt_id,to_jsonb(v_result));
  -- Accepted demo quantities are held in this isolated ledger, never public.inventory.
  return v_result;
end; $$;
revoke all on function public.create_pharmacy_receipt(uuid,jsonb), public.decide_pharmacy_receipt(uuid,text,text,boolean) from public, anon;
grant execute on function public.create_pharmacy_receipt(uuid,jsonb), public.decide_pharmacy_receipt(uuid,text,text,boolean) to authenticated;
revoke all on function public.record_pharmacy_verification(uuid,uuid,uuid,uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.record_pharmacy_verification(uuid,uuid,uuid,uuid,integer,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
