INSERT INTO public.library_settings (key, value, description)
VALUES ('barcode_prefix', 'BV', '자체 바코드 접두사')
ON CONFLICT (key) DO NOTHING;
