# 아스테리움시그니처 브랜드 색상표

업로드된 CENTREVILLE ASTERIUM 로고의 실제 주색 `#553F1C`를 기준으로 구성한 앱 색상 체계입니다.

## 핵심 팔레트

| 역할 | 색상 | 용도 |
|------|------|------|
| Signature Bronze | `#553F1C` | 로고 원색, 기본 버튼, 핵심 강조, 선택 상태 |
| Warm Gold | `#A98243` | 포커스 링, 그래프, 보조 강조 |
| Soft Gold | `#D7BF8B` | 배지, 강조 배경, 장식 요소 |
| Sand | `#F1E7D4` | 보조 버튼, 선택 영역, 사이드바 강조 |
| Ivory | `#FBF8F1` | 앱 기본 배경 |
| Paper White | `#FFFDFC` | 카드와 팝오버 배경 |
| Espresso | `#2B2115` | 본문과 제목 텍스트 |
| Taupe | `#756855` | 보조 설명 텍스트 |

## 적용 원칙

- `#553F1C` 위에는 흰색 또는 Ivory 텍스트를 사용합니다.
- 넓은 화면 배경에는 Bronze 대신 Ivory를 사용해 답답함을 줄입니다.
- Gold 계열은 강조와 차트에 사용하고 긴 본문 텍스트에는 사용하지 않습니다.
- 카드와 입력창은 Paper White와 Sand 테두리로 구분합니다.
- 오류와 위험 동작은 브랜드색으로 대체하지 않고 기존 적색 destructive 색상을 유지합니다.

## 다크 모드

다크 모드는 Espresso 계열 배경과 밝은 Gold 포인트를 사용합니다. 로고 원색은 어두운 배경에서 대비가 낮을 수 있으므로 UI 강조색은 밝은 Gold로 조정하되 원본 로고 파일 자체는 변경하지 않습니다.

## 구현 위치

- 테마 토큰: `src/lib/themes.ts`의 `asterium`
- 기본 브랜드 정보: `src/lib/branding.ts`
- 로고 파일: `public/asterium-signature-logo.png`
- DB 기본값: `supabase/migrations/00021_asterium_branding.sql`
