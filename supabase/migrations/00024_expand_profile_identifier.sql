-- 관리자 프로필은 phone_number 컬럼을 내부 식별자(admin_<username>)로도 사용한다.
-- 일반 주민의 휴대폰 번호 검증은 앱에서 계속 10~11자로 유지된다.
ALTER TABLE public.profiles
  ALTER COLUMN phone_number TYPE varchar(64);
