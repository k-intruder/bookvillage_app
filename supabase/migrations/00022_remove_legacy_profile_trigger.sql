-- 프로필은 Server Action과 setup API에서 명시적으로 생성한다.
-- 초기 스키마의 레거시 트리거는 메타데이터가 없는 Auth 사용자 생성 시
-- NOT NULL 위반을 일으키고, 메타데이터가 있어도 프로필 중복 생성을 유발한다.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
