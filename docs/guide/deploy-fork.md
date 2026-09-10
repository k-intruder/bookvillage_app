# 포크 버전 실전 배포 가이드

이 문서는 `k-intruder/bookvillage_app` 저장소를 Supabase와 Vercel에 배포하는 절차입니다.
먼저 `dev` 브랜치를 Preview 환경에서 검증하고, 검증된 커밋을 `main`에 병합해 Production으로 배포하는 흐름을 권장합니다.

## 1. 배포 구조

| 구분 | Git 브랜치 | Vercel 환경 | 용도 |
|------|------------|-------------|------|
| 개발 검증 | `dev` | Preview | 신규 마이그레이션과 기능 확인 |
| 실제 운영 | `main` | Production | 주민과 관리자가 사용하는 서비스 |

운영 데이터 보호를 위해 가능하면 Supabase 프로젝트도 개발용과 운영용을 분리하세요.

## 2. 준비물

- GitHub 저장소: `https://github.com/k-intruder/bookvillage_app`
- Supabase 계정과 새 프로젝트
- Vercel 계정
- 카카오 개발자 REST API 키
- Node.js 20 이상

## 3. 로컬 사전 검증

```powershell
git switch dev
git pull origin dev
npm ci
npm run lint
npm run build
```

현재 저장소 전체 lint에는 기존 코드의 오류가 남아 있을 수 있습니다. 배포 전에는 최소한 `npm run build`가 성공해야 합니다.

## 4. Supabase 프로젝트 준비

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트를 만듭니다.
2. 한국 사용자 대상이면 Seoul 리전을 선택합니다.
3. Project Settings의 API Keys 화면에서 다음 값을 확인합니다.

| Supabase 값 | 환경변수 |
|-------------|----------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable 또는 anon key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret 또는 service_role key | `SUPABASE_SERVICE_ROLE_KEY` |

`SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 노출하면 안 됩니다. Vercel의 서버 환경변수로만 등록하세요.

## 5. 데이터베이스 마이그레이션

### 새 Supabase 프로젝트

프로젝트 루트에서 다음 명령을 실행합니다.

```powershell
npx supabase login
npx supabase link --project-ref "YOUR_PROJECT_REF"
npx supabase db push
```

확인 질문이 나오면 적용할 마이그레이션 목록을 검토한 후 승인합니다. `00001`부터 `00022`까지 순서대로 적용되어야 합니다.

### 기존 운영 DB를 업그레이드하는 경우

먼저 Supabase Dashboard에서 백업을 확보하세요. `00020`은 한 도서에 활성 대출이 두 건 이상 존재하면 unique index 생성 단계에서 실패합니다.

SQL Editor에서 중복 여부를 먼저 확인합니다.

```sql
select book_id, count(*) as active_rentals
from public.rentals
where returned_at is null
group by book_id
having count(*) > 1;
```

결과가 0행이어야 합니다. 결과가 있다면 실제 대출 상태를 확인하여 잘못된 대출을 먼저 반납 처리한 후 `npx supabase db push`를 실행하세요.

적용 여부는 다음 SQL로 확인할 수 있습니다.

```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname = 'rentals_one_active_per_book';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'change_jelly_balance';
```

## 6. 환경변수 준비

`.env.example`을 복사해 로컬 전용 파일을 만듭니다.

```powershell
Copy-Item .env.example .env.local
```

`SETUP_SECRET`은 최소 32바이트 무작위 값으로 생성하세요.

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

`.env.local`에 다음 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-or-service-role-key
KAKAO_REST_API_KEY=your-kakao-rest-api-key
SETUP_SECRET=your-64-character-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:6100
```

`.env.local`은 Git에 커밋하지 마세요.

## 7. Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/new)에서 Add New Project를 선택합니다.
2. `k-intruder/bookvillage_app` 저장소를 Import합니다.
3. Framework Preset은 Next.js를 선택합니다.
4. Build Command와 Output Directory는 기본값을 사용합니다.
5. Node.js 버전은 20 이상으로 설정합니다.

Settings → Git에서 Production Branch가 `main`인지 확인합니다. `dev`에 push된 커밋은 Preview Deployment로 생성됩니다.

## 8. Vercel 환경변수 등록

Settings → Environment Variables에서 아래 값을 등록합니다.

| 변수 | Preview | Production |
|------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | O | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | O | O |
| `SUPABASE_SERVICE_ROLE_KEY` | O | O |
| `KAKAO_REST_API_KEY` | O | O |
| `SETUP_SECRET` | O | O |
| `NEXT_PUBLIC_APP_URL` | Preview URL | 실제 운영 URL |

개발용·운영용 Supabase를 분리했다면 Preview와 Production에 서로 다른 값을 넣습니다.

## 9. `dev` Preview 배포

현재 `dev` 브랜치는 `origin/dev`를 추적합니다.

```powershell
git switch dev
git push origin dev
```

Vercel의 Deployments 화면에서 `dev` Preview 배포가 성공했는지 확인합니다. 환경변수를 배포 후 추가했다면 Redeploy가 필요합니다.

배포 URL의 헬스체크를 확인합니다.

```powershell
Invoke-RestMethod "https://YOUR-PREVIEW-URL/api/health"
```

정상 결과는 `status: healthy`, `env: ok`, `supabase: ok`입니다.

## 10. 최초 관리자 생성

관리자가 한 명도 없을 때만 실행합니다. 비밀번호는 12자 이상이어야 합니다.

```powershell
$deployUrl = "https://YOUR-PREVIEW-URL"
$setupSecret = "YOUR_SETUP_SECRET"
$headers = @{ Authorization = "Bearer $setupSecret" }
$body = @{
  username = "admin"
  password = "replace-with-a-strong-password"
  name = "관리자"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$deployUrl/api/setup" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

성공 후 `/admin/login`에서 로그인합니다. 관리자가 생성되면 `/api/setup`은 다시 실행되지 않지만, 공격 표면을 줄이기 위해 Vercel에서 `SETUP_SECRET`을 삭제하고 Redeploy하는 것을 권장합니다. 삭제 후 setup API는 `503`으로 비활성화됩니다.

## 11. 기능 점검

Preview 환경에서 다음 항목을 확인합니다.

- 관리자 로그인과 관리자 메뉴 접근
- 주민 가입·로그인
- 도서 등록과 카카오 도서 검색
- 대출, 반납, 당일 대출 취소
- 젤리 잔액과 이력의 동시 반영
- 같은 도서의 중복 대출 차단
- 이미지 업로드와 공지사항 표시

브라우저 개발자 도구와 Vercel Functions 로그에 오류가 없는지도 확인하세요.

## 12. Production 배포

Preview 검증이 끝나면 GitHub에서 `dev` → `main` Pull Request를 만들고 병합합니다. `main` 병합이 Vercel Production 배포를 시작합니다.

```powershell
git switch main
git pull origin main
git merge --ff-only dev
git push origin main
```

GitHub Pull Request를 사용하는 경우 로컬 merge 명령은 생략합니다. Production이 별도 Supabase 프로젝트를 사용한다면 5단계의 마이그레이션과 10단계의 최초 관리자 생성을 Production 기준으로 다시 수행해야 합니다.

## 13. 배포 후 운영 체크리스트

- `/api/health`가 HTTP 200을 반환하는가
- Vercel Production 환경변수에 실제 운영값이 들어갔는가
- `SUPABASE_SERVICE_ROLE_KEY`가 `NEXT_PUBLIC_` 변수로 등록되지 않았는가
- `00020_security_and_integrity.sql`이 적용됐는가
- `00021_asterium_branding.sql`이 적용됐는가
- `00022_remove_legacy_profile_trigger.sql`이 적용됐는가
- 최초 관리자 생성 후 `SETUP_SECRET`을 제거했는가
- 관리자와 주민 계정으로 각각 핵심 흐름을 점검했는가
- Supabase 백업 정책과 사용량 알림을 설정했는가

## 문제 해결

### 빌드에서 `supabaseUrl is required`가 표시됨

Vercel 환경변수가 등록되지 않았거나 해당 Preview/Production 환경에 체크되지 않은 상태입니다. 환경변수를 수정한 뒤 Redeploy하세요.

### `00020` 마이그레이션에서 unique violation 발생

동일 도서의 활성 대출이 중복되어 있습니다. 5단계의 중복 확인 SQL로 대상을 찾고 실제 상태를 정리한 뒤 다시 적용하세요.

### `/api/setup`이 401을 반환함

Authorization 헤더의 Bearer 값과 Vercel의 `SETUP_SECRET`이 다릅니다.

### `/api/setup`이 503을 반환함

`SETUP_SECRET`이 설정되지 않아 초기 설정 API가 비활성화된 상태입니다.

### `/api/setup`이 409를 반환함

승인된 관리자가 이미 존재하므로 정상적인 차단입니다. `/admin/login`을 이용하세요.
