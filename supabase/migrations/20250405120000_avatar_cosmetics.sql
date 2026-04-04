-- Wardrobe: head / face / neck cosmetic slots (text ids, validated in app).
alter table public.avatars
  add column if not exists headgear text not null default 'none',
  add column if not exists face_extra text not null default 'none',
  add column if not exists neck_wear text not null default 'none';
