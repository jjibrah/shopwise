-- Run against a disposable local database with database.sql and the pharmacy migration.
-- All fixtures are rolled back. This verifies actual PostgreSQL permissions and RPCs.
\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_ok(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'Assertion failed: %',message; end if; end; $$;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
declare caught boolean := false;
begin
  begin execute statement; exception when others then
    caught := true;
    if position(expected in sqlerrm)=0 then raise exception 'Unexpected error: %',sqlerrm; end if;
  end;
  if not caught then raise exception 'Expected rejection: %',statement; end if;
end; $$;
insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000001','pharmacy-a@example.test'),('10000000-0000-4000-8000-000000000002','pharmacy-b@example.test');
insert into public.shops(id,owner_id,name) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Demo pharmacy A'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Demo pharmacy B');
insert into public.products(shop_id,name,unit) values('20000000-0000-4000-8000-000000000001','Existing POS product','packs');
select count(*) as count from public.inventory_movements \gset before_movements_
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select jsonb_build_object('request_id','30000000-0000-4000-8000-000000000001','supplier','Demo supplier','delivery_reference','DEMO-DELIVERY','medicine','Demo paracetamol','product_code','DEMO-PARA-500','batch_number','DEMO-MATCH-26','printed_expiry','2028-06-30','quantity',24,'unit','packs')::text as input \gset
select (public.create_pharmacy_receipt('20000000-0000-4000-8000-000000000001',:'input'::jsonb)).id as id \gset receipt_
select pg_temp.assert_ok((public.create_pharmacy_receipt('20000000-0000-4000-8000-000000000001',:'input'::jsonb)).id=:'receipt_id'::uuid,'duplicate receiving request returns the same record');
select pg_temp.expect_error(format('select public.create_pharmacy_receipt(%L,%L::jsonb)','20000000-0000-4000-8000-000000000001',(:'input'::jsonb || '{"quantity":25}'::jsonb)::text),'PHARMACY_CONFLICT');
select pg_temp.expect_error(format('select public.decide_pharmacy_receipt(%L,%L,%L,true)',:'receipt_id','accepted','Packaging inspected'),'PHARMACY_CONFLICT');
select pg_temp.expect_error('update public.pharmacy_receipts set outcome=''matched''','permission denied');
select pg_temp.expect_error('select public.record_pharmacy_verification(null,null,null,null,1,''{}'')','permission denied');
reset role;
set local role service_role;
select public.record_pharmacy_verification('20000000-0000-4000-8000-000000000001',:'receipt_id','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,jsonb_build_object('source','demo','outcome','matched','checkedAt',now(),'authenticity','not_checked'));
select public.record_pharmacy_verification('20000000-0000-4000-8000-000000000001',:'receipt_id','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1,jsonb_build_object('source','demo','outcome','matched','checkedAt',now()));
select pg_temp.assert_ok((select count(*)=1 from public.pharmacy_verifications where receipt_id=:'receipt_id'),'duplicate verification writes once');
select pg_temp.expect_error(format('select public.record_pharmacy_verification(%L,%L,%L,%L,1,%L::jsonb)','20000000-0000-4000-8000-000000000001',:'receipt_id','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','{"source":"demo","outcome":"matched"}'),'PHARMACY_CONFLICT');
set local role authenticated;
select pg_temp.expect_error(format('select public.decide_pharmacy_receipt(%L,%L,%L,false)',:'receipt_id','accepted','Packaging inspected'),'PHARMACY_CONFLICT');
select public.decide_pharmacy_receipt(:'receipt_id','accepted','Packaging inspected',true);
select public.decide_pharmacy_receipt(:'receipt_id','accepted','Packaging inspected',true);
select pg_temp.expect_error(format('select public.decide_pharmacy_receipt(%L,%L,%L,true)',:'receipt_id','quarantined','Changed decision'),'PHARMACY_CONFLICT');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_ok((select count(*)=0 from public.pharmacy_receipts),'another pharmacy cannot read delivery');
select pg_temp.assert_ok((select count(*)=0 from public.pharmacy_verifications),'another pharmacy cannot read evidence');
select pg_temp.expect_error(format('select public.decide_pharmacy_receipt(%L,%L,%L,true)',:'receipt_id','accepted','Packaging inspected'),'Owner access required');
reset role;
select pg_temp.assert_ok((select count(*)=1 from public.audit_logs where record_id=:'receipt_id' and action='PHARMACY_DECIDED'),'duplicate decisions write one audit event');
select pg_temp.assert_ok((select sum(quantity)=0 from public.inventory),'accepted demo packages never enter POS inventory');
select pg_temp.assert_ok((select count(*)=:'before_movements_count'::int from public.inventory_movements),'demo acceptance leaves POS stock movements unchanged');
-- Exhaustively reject blocked outcomes, stale evidence, and missing timestamps.
do $$
declare v_id uuid; v_outcome text; v_evidence jsonb; v_case integer;
begin
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  for v_case in 1..8 loop
    v_id:=gen_random_uuid();
    v_outcome:=case v_case when 1 then 'mismatch' when 2 then 'recalled' when 3 then 'expired' when 4 then 'not_found' when 5 then 'unavailable' else 'matched' end;
    v_evidence:=jsonb_build_object('source','demo','outcome',v_outcome,'checkedAt',case when v_case=6 then now()-interval '20 minutes' when v_case=8 then now()+interval '10 minutes' else now() end);
    if v_case=7 then v_evidence:=v_evidence-'checkedAt'; end if;
    insert into public.pharmacy_receipts(id,shop_id,created_by,request_id,supplier,delivery_reference,medicine,product_code,batch_number,printed_expiry,quantity,unit,outcome,latest_evidence)
    values(v_id,'20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',gen_random_uuid(),'Demo supplier','DEMO-BLOCKED','Demo medicine','DEMO-PRODUCT','DEMO-BATCH','2028-06-30',12,'packs',v_outcome,v_evidence);
    perform pg_temp.expect_error(format('select public.decide_pharmacy_receipt(%L,%L,%L,true)',v_id,'accepted','Packaging inspected'),'PHARMACY_CONFLICT');
    perform public.decide_pharmacy_receipt(v_id,'quarantined','Held for further review',false);
  end loop;
end; $$;
rollback;
\echo Pharmacy database safeguards passed.
