-- Velvet v3.12 gallery durability + privacy.
-- A dedicated private bucket lets the character gallery survive reloads/devices
-- without exposing newly uploaded scrapbook images through a public URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-gallery',
  'character-gallery',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their character gallery" on storage.objects;
create policy "Users can read their character gallery"
on storage.objects for select to authenticated
using (
  bucket_id = 'character-gallery'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload their character gallery" on storage.objects;
create policy "Users can upload their character gallery"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'character-gallery'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'gallery'
);

drop policy if exists "Users can update their character gallery" on storage.objects;
create policy "Users can update their character gallery"
on storage.objects for update to authenticated
using (
  bucket_id = 'character-gallery'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'character-gallery'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their character gallery" on storage.objects;
create policy "Users can delete their character gallery"
on storage.objects for delete to authenticated
using (
  bucket_id = 'character-gallery'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- RC1 used character-media for gallery uploads. Public object URLs work, but
-- Storage.list still needs SELECT RLS. This policy keeps those early uploads
-- visible after the fix so the user never loses a photo during the transition.
drop policy if exists "Users can list legacy character gallery" on storage.objects;
create policy "Users can list legacy character gallery"
on storage.objects for select to authenticated
using (
  bucket_id = 'character-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'gallery'
);
