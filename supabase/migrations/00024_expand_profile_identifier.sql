-- 관리자 프로필은 phone_number 컬럼을 내부 식별자(admin_<username>)로도 사용한다.
-- 일반 주민의 휴대폰 번호 검증은 앱에서 계속 10~11자로 유지된다.
DROP VIEW IF EXISTS public.overdue_rentals;

ALTER TABLE public.profiles
  ALTER COLUMN phone_number TYPE varchar(64);

CREATE VIEW public.overdue_rentals AS
SELECT
  r.id,
  r.book_id,
  r.user_id,
  r.rented_at,
  r.due_date,
  (CURRENT_DATE - r.due_date) AS overdue_days,
  b.title AS book_title,
  b.barcode AS book_barcode,
  p.name AS user_name,
  p.dong_ho AS user_dong_ho,
  p.phone_number AS user_phone,
  EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.rental_id = r.id AND n.type = '7day' AND n.status = 'sent'
  ) AS notified_7day,
  EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.rental_id = r.id AND n.type = '30day' AND n.status = 'sent'
  ) AS notified_30day
FROM public.rentals r
JOIN public.books b ON b.id = r.book_id
JOIN public.profiles p ON p.id = r.user_id
WHERE r.returned_at IS NULL
  AND r.due_date < CURRENT_DATE;

GRANT SELECT ON public.overdue_rentals TO authenticated, service_role;
