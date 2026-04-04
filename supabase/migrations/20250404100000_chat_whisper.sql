-- Личные сообщения в лобби (шёпот): видят только отправитель и получатель
alter table public.chat_messages
  add column if not exists recipient_profile_id uuid references public.profiles (id) on delete set null;

create index if not exists chat_messages_recipient_idx
  on public.chat_messages (recipient_profile_id)
  where recipient_profile_id is not null;

drop policy if exists "chat_select" on public.chat_messages;
drop policy if exists "chat_insert_own" on public.chat_messages;

create policy "chat_select_visible" on public.chat_messages for select using (
  recipient_profile_id is null
  or auth.uid() = profile_id
  or auth.uid() = recipient_profile_id
);

create policy "chat_insert_own" on public.chat_messages for insert with check (
  auth.uid() = profile_id
  and (
    recipient_profile_id is null
    or recipient_profile_id is distinct from auth.uid()
  )
);

comment on column public.chat_messages.recipient_profile_id is 'null = общий чат; иначе шёпот только адресату';
