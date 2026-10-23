-- Owned cards must never disappear: hidden (inactive) cards stay readable so
-- collections still render them, and a card with printed copies can't be deleted.
alter policy "cards readable" on public.cards using (true);

create or replace function public.prevent_owned_card_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.card_instances where card_id = old.id) then
    raise exception 'Players own copies of "%". Hide it (set inactive) instead of deleting.', old.name;
  end if;
  return old;
end;
$$;

create trigger cards_prevent_owned_delete
before delete on public.cards
for each row execute function public.prevent_owned_card_delete();

revoke execute on function public.prevent_owned_card_delete() from public, anon, authenticated;
