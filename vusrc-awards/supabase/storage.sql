-- Nominee photos bucket (public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('nominee-photos', 'nominee-photos', true);

-- Category banners bucket (public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('category-banners', 'category-banners', true);

-- Allow public read on nominee-photos
CREATE POLICY "Public read nominee photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'nominee-photos');

-- Allow public read on category-banners
CREATE POLICY "Public read category banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-banners');
