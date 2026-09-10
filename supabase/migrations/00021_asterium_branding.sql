-- 아스테리움시그니처 기본 브랜딩
INSERT INTO public.library_settings (key, value, description) VALUES
  ('apartment_name', '아스테리움시그니처', '아파트 이름'),
  ('logo_url', '/asterium-signature-logo.png', '도서관 로고 URL'),
  ('site_type', 'apartment', '사이트 유형'),
  ('color_theme', 'asterium', '컬러 테마'),
  ('og_title', '아스테리움시그니처 작은도서관', '공유 제목'),
  ('og_description', '아스테리움시그니처 주민을 위한 작은도서관', '공유 설명')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();
