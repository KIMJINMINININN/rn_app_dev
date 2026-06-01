# Vercel 배포 가이드 — MatLog (apps/web)

> 작성 2026-06-02 · 대상 브랜치 `feature/mma-record` · 모노레포 `the-others`(pnpm 10.33) / 앱 `@the-others/web`(`apps/web`, Next 16.2.4)
> ⚠️ **시크릿 원칙:** 아래 값들은 **Supabase 대시보드 → Vercel 대시보드로 직접 복붙**합니다. 채팅/커밋에 절대 넣지 마세요. (`.env.local`은 gitignore라 배포에 안 올라가고, Vercel은 자체 env를 씁니다.)

---

## 0. 사전 준비 (이미 됨 ✅ / 확인만)
- ✅ Supabase 프로젝트 `the-others-mma`(Seoul) 라이브 + 마이그레이션 0001~0016 적용
- ✅ `training-media` 버킷 생성됨(비공개) + storage RLS(0014)
- ✅ `AUTH_ENABLED=true`로 로컬 검증 완료(로그인·세션·미디어 동작)
- 확인: 배포 전 `feature/mma-record`가 최신 push 상태인지 (`git status` clean, `git log --oneline -1`)

---

## 1. Vercel 프로젝트 생성

1. [vercel.com](https://vercel.com) → **Add New… → Project** → GitHub 레포 `KIMJINMINININN/rn_app_dev` import.
2. **Configure Project**에서:
   - **Root Directory** → **`apps/web`** 로 설정 (⭐ 가장 중요 — 모노레포라 앱 위치를 지정). "Edit" 눌러 `apps/web` 선택.
   - **Framework Preset** → `Next.js` (자동 감지됨).
   - **Build/Install Command** → 기본값 유지(비워둠). Vercel이 `packageManager: pnpm@10.33` 감지 → 루트에서 `pnpm install` 후 `apps/web`에서 `next build` 실행.
     - 혹시 install이 워크스페이스 의존성을 못 잡으면(빌드 에러): Install Command를 `pnpm install`로 명시.
   - **Node.js Version** → **20.x 이상**(Next 16 요구). Settings에서 20 또는 22 선택.
3. **Production Branch** → Settings → Git → Production Branch를 **`feature/mma-record`** 로 지정(아직 main 머지 전이므로). 나중에 main 머지하면 main으로 바꿔도 됨.
4. 환경 변수는 **2번에서 먼저 넣고** 배포(아래). 안 넣고 배포하면 dormant(로그인 OFF) 상태로 빌드됨.

---

## 2. 환경 변수 (⭐ 빌드 전에 설정)

> **중요:** `NEXT_PUBLIC_*`는 **빌드 시점에 번들로 인라인**됩니다 → env를 넣고 **나서** 빌드해야 적용. 나중에 바꾸면 **재배포(redeploy)** 필요(런타임 변경 안 됨).

Vercel → 프로젝트 → **Settings → Environment Variables**. 각 항목 **Production**(원하면 Preview도) 체크.

| 변수명 | 값 출처 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 대시보드 → Project Settings → **Data API** → Project URL (`https://cbjahigkhlvttnpmfdls.supabase.co`) | 공개값 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → **API Keys** → `Publishable key`(`sb_publishable_…`) | 공개값(브라우저 노출 OK) |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → **API Keys** → `Secret key`(`sb_secret_…`) | 🔒 **서버 전용 시크릿** — NEXT_PUBLIC 아님. 서명 업로드 발급(admin)용 |
| `NEXT_PUBLIC_AUTH_ENABLED` | 직접 입력 → **`true`** | 이게 true여야 로그인·읽기/쓰기 라이브 |

**선택(기본값 있어 생략 가능):**
| 변수명 | 기본값(코드) | 넣을 때 |
|---|---|---|
| `NEXT_PUBLIC_MEDIA_BUCKET` | `training-media` | 버킷명 다를 때만 |
| `NEXT_PUBLIC_UPLOAD_MAX_BYTES` | `104857600`(100MiB) | 한도 조정 시 |
| `NEXT_PUBLIC_UPLOAD_MAX_DURATION_SEC` | `60` | 한도 조정 시 |

**넣지 않음:** `E2E_*`(테스트 전용) · `YOUTUBE_API_KEY`(유튜브 검색 API 미연동 — 링크 임베드는 키 불필요).

설정 후 → **Deployments → 최신 빌드 Redeploy**(env 반영).

---

## 3. 배포 & 도메인 확인
- 첫 배포 완료되면 `https://<프로젝트>.vercel.app` 도메인 발급 → 메모(다음 단계에 씀).
- (선택) 커스텀 도메인 붙이려면 Settings → Domains.

---

## 4. Supabase Auth URL 설정 (배포 도메인 등록)

Supabase 대시보드 → **Authentication → URL Configuration**:
- **Site URL** → `https://<프로젝트>.vercel.app` (메일 링크·기본 리다이렉트 기준).
- **Redirect URLs** → 같은 도메인 추가. Preview 배포도 쓸 거면 `https://*.vercel.app` 패턴 추가.

> 이메일/비번 로그인이고 email confirm OFF라 리다이렉트 의존도는 낮지만, site_url은 맞춰두는 게 안전(비번 재설정 등 메일 링크가 이 도메인을 씀).

**Storage CORS(업로드 안 될 때만):** 업로드(`uploadToSignedUrl` PUT)가 브라우저→Supabase Storage로 갑니다. 기본 CORS가 전체 허용이라 보통 그대로 동작. 만약 업로드만 실패하면 Supabase Storage 설정의 허용 오리진에 Vercel 도메인 추가.

---

## 5. 동작 확인 체크리스트 (배포 후)
1. `https://<도메인>/login` 200 → **회원가입/로그인** 성공
2. 새 계정이면 기술 라이브러리에 **프리셋 41종**이 떠야 함(0016 시드)
3. **세션 추가** → 종목+날짜 저장 → 캘린더에 점 표시
4. 세션에 **유튜브 링크** 첨부 저장 → 캘린더 그 날 SessionCard에 **임베드 재생** ✅
5. 세션/기술에 **영상 업로드**(≤60s/100MB) → 저장 → **서명URL로 인앱 재생** ✅
6. 태그 붙여 저장 → `/tags`에서 필터 → 항목 뜸
7. 검색(`/search?q=`)·기술 상세 "이 기술을 다룬 세션" 클릭 → **그 날짜 캘린더로 진입**(딥링크)
8. 일부러 네트워크 끊고 새로고침 → **"데이터를 불러오지 못했어요" 토스트 + 재시도** 뜨는지

---

## 6. 모바일 (WebView) 도메인 교체
`apps/mobile/config/env.ts`의 per-env `CLIENT_URL` placeholder(`dev/beta/prod.example.com`)를 실제 Vercel 도메인으로 교체:
- **develop**: 개발 중엔 `EXPO_PUBLIC_CLIENT_URL=https://<도메인>` 오버라이드로도 됨(env.ts 안 건드리고).
- **production**: `env.ts`의 `production.CLIENT_URL`을 실 도메인으로 (이건 코드 변경 → 커밋).
- 그 뒤 Expo 앱이 WebView로 배포된 MatLog을 로드. (네이티브 촬영/토큰 secure-store 브릿지는 P1)

---

## 트러블슈팅
- **빌드는 됐는데 로그인 OFF(dormant)** → `NEXT_PUBLIC_AUTH_ENABLED=true` 누락 또는 env 넣기 전 빌드됨 → env 확인 후 **Redeploy**.
- **클라 읽기만 "URL and Key required"** → `NEXT_PUBLIC_SUPABASE_*` 누락/오타. 빌드시 인라인이라 **Redeploy** 필요(런타임 변경 X).
- **모노레포 install 실패** → Root Directory가 `apps/web`인지 확인 + Install Command `pnpm install` 명시.
- **Node 버전 에러** → Settings에서 Node 20+.
- **업로드만 실패(PUT)** → Storage CORS에 Vercel 도메인 추가 / `SUPABASE_SECRET_KEY`(서명 발급) 설정 확인.
- **세션은 되는데 영상 재생 안 됨** → `training-media` 버킷 존재 + storage RLS(0014) 적용 확인(소유자 SELECT).

---

## 한눈 요약
1. Vercel 프로젝트 import → **Root Directory `apps/web`** + Node 20+ + Production Branch `feature/mma-record`
2. env 4개 필수(`NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`·`SUPABASE_SECRET_KEY`·`NEXT_PUBLIC_AUTH_ENABLED=true`) → **넣고 Redeploy**
3. Supabase Auth **Site URL/Redirect**에 Vercel 도메인
4. 동작 확인(5번 체크리스트)
5. 모바일 `CLIENT_URL` 교체
