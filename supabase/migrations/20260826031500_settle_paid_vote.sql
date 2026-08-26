-- Atomically settle a successful paid vote.
-- The payment row is locked before checking/creating the vote, so repeated
-- or concurrent Monetbil webhooks cannot credit the same payment twice.

create or replace function public.settle_paid_vote(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p payments%rowtype;
  pkg vote_packages%rowtype;
  v_id uuid;
  v_qty integer;
begin
  select * into p
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Paiement introuvable';
  end if;

  if p.status = 'paid' then
    select id, quantity into v_id, v_qty
    from public.votes
    where payment_id = p.id
    limit 1;

    return jsonb_build_object(
      'votesAdded', false,
      'voteQuantity', coalesce(v_qty, 0),
      'alreadyProcessed', true
    );
  end if;

  select * into pkg
  from public.vote_packages
  where id = p.package_id
    and is_active = true;

  if not found then
    raise exception 'Pack de votes introuvable ou inactif';
  end if;

  if exists (select 1 from public.votes where payment_id = p.id) then
    update public.payments
    set status = 'paid', payment_method = 'monetbil'
    where id = p.id;

    select quantity into v_qty
    from public.votes
    where payment_id = p.id
    limit 1;

    return jsonb_build_object(
      'votesAdded', false,
      'voteQuantity', coalesce(v_qty, pkg.vote_quantity),
      'alreadyProcessed', true
    );
  end if;

  insert into public.votes (
    candidate_id,
    user_id,
    payment_id,
    quantity
  ) values (
    p.candidate_id,
    p.user_id,
    p.id,
    pkg.vote_quantity
  )
  returning id, quantity into v_id, v_qty;

  update public.payments
  set status = 'paid', payment_method = 'monetbil'
  where id = p.id;

  return jsonb_build_object(
    'votesAdded', true,
    'voteQuantity', v_qty,
    'alreadyProcessed', false
  );
end;
$$;

revoke all on function public.settle_paid_vote(uuid) from public;
grant execute on function public.settle_paid_vote(uuid) to service_role;
