# Phase 6 — 스마트 입력 (바코드 + OCR)

> ralph 실행 단위. 본 파일 + 참조: docs/plans/db-schema.md, docs/plans/conventions.md, docs/PRD.md
>
> **상태**: 미시작 (ROI 검증 후 진입)
> **선행 phase**: Phase 1 (필수 — ingredient_master + user_ingredients). Phase 5 종료 후 ROI 평가 권장.
> **후속 phase**: 없음 (또는 v2 검토)
> **예상 기간**: 2주 (PoC 1일 포함)
> **비용 게이트**: $5/월 한도 — PoC 결과 초과 예상 시 phase deferred

---

## §0 사전 의존성 + 환경 변수

### 체크박스
- [ ] Phase 1 완료 (Acceptance + DoD 모두 통과)
- [ ] supabase/migrations/ 마지막 번호 = 0016 (본 phase는 0017부터 시작)
- [ ] **PoC 1일 (★ 본 phase 첫 작업)**: ML Kit + Naver Clova 영수증 5장씩 OCR 정확도 측정 + 비용 산정 (Architect 권고 5). 둘 중 한 쪽 정확도 ≥ 70% 달성 확인. 미달 시 phase deferred.
- [ ] **외부 API 키 발급**:
  - 식약처 식품안전나라 OpenAPI (바코드 → 상품정보, 1일 1000회 무료) — 가입 + 키 발급 1–3일 소요
  - Naver Clova General OCR API key (Plan B, 데스크탑 fallback) — 종량제, 키 발급 1일 소요
  - **Google ML Kit** — RN 측 native 모듈 (`@react-native-ml-kit/text-recognition`) 추가 — apps/mobile rebuild 필요
- [ ] webview-protocol 패키지 OCR/Barcode 메시지 확장 가능 (`@the-others/webview-protocol`)
- [ ] **마이그레이션 번호 충돌 확인**: `apps/web/supabase/migrations/` 마지막 번호 확인. 0016 이하여야 함.

### 환경 변수 (신규)
| 변수 | 위치 | 용도 |
|---|---|---|
| `BARCODE_API_KEY` | 서버 전용 (Route Handler 내부) | 식약처 식품안전나라 OpenAPI 인증 키 |
| `NAVER_CLOVA_OCR_API_KEY` | 서버 전용 (Route Handler 내부) | Clova General OCR 인증 키 (Plan B) |
| `NAVER_CLOVA_OCR_INVOKE_URL` | 서버 전용 (Route Handler 내부) | Clova OCR invoke URL |
| `OCR_FALLBACK_ENABLED` | 서버 전용 | Clova fallback 활성 여부. 비용 게이트 hit 시 `false`로 토글 |

> **보안**: `BARCODE_API_KEY`, `NAVER_CLOVA_OCR_API_KEY`, `NAVER_CLOVA_OCR_INVOKE_URL` 는 Route Handler 내부에서만 호출. RSC/Server Action에서 직접 접근 절대 금지 (conventions.md §8 참조).

---

## §0.5 cross-phase 의존성

### 0.5.1 인용 테이블

| 테이블 | 정의 phase | 사용 컬럼 | 풀 본문 |
|---|---|---|---|
| `ingredient_master` | Phase 1 (0005) | `id`, `name`, `category_id`, `default_shelf_life_days`, `default_storage_kind` (바코드 매칭 + 신규 추가) | `db-schema.md §3.2 0005` |
| `user_ingredients` | Phase 1 (0007) | `user_id`, `ingredient_master_id`, `quantity`, `unit`, `expires_at`, `storage_location_id` | `db-schema.md §3.2 0007` |

### 0.5.2 인용 RPC/함수

없음 (본 phase는 자체 캐시/매칭 로직).

### 0.5.3 영향받는 cross-cutting 룰 (conventions.md)

- **§1 Result<T, string>** — 모든 Server Action 반환 타입 (scanBarcode, processReceipt, confirmImport)
- **§10 Server Action vs Route Handler** — 외부 API proxy(바코드 lookup, OCR fallback)는 **Route Handler** 사용. 도메인 mutation은 Server Action.
- **§8 SUPABASE_SECRET_KEY (admin client)** — `barcode_cache` write + `receipt_uploads` write는 `createSupabaseAdminClient()`만 사용. RSC/Server Action에서 admin client 직접 호출 절대 금지.
- **§17 TanStack Query queryKey** — `['barcode', code]`, `['ocr-receipt', uploadId]` 네이밍 룰 준수.
- **§6 RLS 패턴** (db-schema.md §4):
  - `barcode_cache`: read-only seed 패턴 (§4.3) — read 인증 사용자 모두, write admin only
  - `receipt_uploads`: 사용자별 격리 패턴 (§4.1)

### 0.5.4 webview-protocol 확장 (apps/mobile ↔ apps/web)

[Architect 권고 5 — OCR 4메시지 + Barcode 3메시지 추가]

현재 `packages/webview-protocol/src/index.ts`는 `AuthMessage` 타입만 정의되어 있음. Phase 6에서 아래 타입을 동일 파일에 추가한다.

```ts
// packages/webview-protocol/src/index.ts 확장 대상

/** OCR 도메인 메시지 (4개) */
export type OcrMessage =
  | { mode: 'OCR_RECEIPT_REQUEST'; data?: undefined }
  | { mode: 'OCR_RECEIPT_RESULT'; data: { lines: string[]; raw: string; ts: number } }
  | { mode: 'OCR_RECEIPT_CANCEL'; data?: undefined }
  | { mode: 'OCR_RECEIPT_ERROR'; data: { code: string; message: string } };

/** 바코드 도메인 메시지 (3개) */
export type BarcodeMessage =
  | { mode: 'BARCODE_SCAN_REQUEST'; data?: undefined }
  | { mode: 'BARCODE_SCAN_RESULT'; data: { code: string; format: string } }
  | { mode: 'BARCODE_SCAN_CANCEL'; data?: undefined };
```

> **패키지 버전 bump**: webview-protocol 변경 후 package.json minor 버전 bump + DoD 게이트 포함.

---

## §1 목표 / 출시 가능 가치

**목표**: PRD §2.2 — 바코드 스캔과 영수증 OCR로 식재료 일괄 등록. 외부 API 의존이 가장 큰 phase로 마지막에 배치. ROI 검증(Phase 5 종료 후 DAU 측정) 후 진입.

**가시적 변화**:
- 인벤토리 "+" 메뉴 → "바코드 스캔" / "영수증 촬영" 옵션 신규 표시
- **바코드 경로**: 스캔 → 상품정보(barcode_cache hit 또는 식약처 API) → ingredient_master 매칭 또는 신규 INSERT → user_ingredients INSERT
- **영수증 OCR 경로(모바일)**: 카메라 촬영 → ML Kit on-device OCR → lines 반환 → webview-protocol `OCR_RECEIPT_RESULT` 메시지 → 품목 파싱 → 일괄 등록 confirmation 화면
- **영수증 OCR 경로(데스크탑)**: 이미지 파일 업로드 → Supabase Storage → Route Handler `/api/ocr/receipt` → Clova API(`OCR_FALLBACK_ENABLED=true`일 때만) → parsed_items → confirmation 화면
- 두 경로 모두 사용자 검수/수정 dialog → 일괄 user_ingredients INSERT

---

## §1.5 Architect 결정 적용

### OCR 4후보 비교 (Architect Answer 5)

| 후보 | 위치 | 정확도(영수증 한국어) | 비용 | 결정 |
|---|---|---|---|---|
| **Google ML Kit Text Recognition** | 모바일 네이티브 (RN, on-device) | ★★★★ | $0/월 | **1순위 (메인)** |
| Naver Clova General OCR | 서버 | ★★★★★ | ~$4.5/월 @ 1500 호출 | **2순위 fallback** (데스크탑 + ML Kit 실패 시) |
| Google Vision OCR | 서버 | ★★★★ | 월 1000 무료 | 3순위 (Clova 대체 옵션) |
| Tesseract.js | 클라이언트 (wasm) | ★★ (30~50% 보고됨†) | $0 | **비추천** (wasm 16MB, 정확도 낮음) |

> † Tesseract.js 한국어 영수증 정확도 30~50% 수치는 GitHub issues / 한국 OCR 비교 블로그 일반 보고치. 정확한 출처는 PoC 시 자체 영수증 5장 측정 후 `docs/CHANGELOG.md` Phase 6 섹션에 갱신. 본 plan 작성 시점에는 ML Kit/Clova 1·2순위 결정의 보조 근거로만 사용.

### 비용 게이트 룰

- **$5/월 한도**. 트리거 룰: `DAU × 인당영수증 × 30 ≥ 2000` 시 Clova fallback 비활성화(`OCR_FALLBACK_ENABLED=false`). 데스크탑 사용자에게 "모바일 앱에서 촬영해 주세요" UX 표시.
- 일주일 운영 후 Vercel logs에서 OCR 호출 빈도 측정 → 월 환산 비용 산출.

### 하이브리드 흐름 (Architect 권고)

1. **모바일**: webview-protocol `OCR_RECEIPT_REQUEST` 메시지 → RN 측 카메라 + ML Kit 실행 → `OCR_RECEIPT_RESULT` 반환 (lines, raw, ts)
2. **데스크탑**: 이미지 파일 업로드 → Supabase Storage `receipts/{user_id}/` → Route Handler `POST /api/ocr/receipt` → Clova API 호출 → parsed_items 반환

### 바코드 매칭 결정 (3단계 폴백)

1. **1차**: `barcode_cache` lookup (24h TTL, admin client read)
2. **2차**: 식약처 식품안전나라 OpenAPI 호출 → 매칭 성공 시 `barcode_cache` INSERT(admin client) + `ingredient_master`에 글로벌 row INSERT
3. **3차**: 매칭 실패 시 사용자 수동 입력 폴백 UI (이름, 카테고리)

---

## §2 DB 마이그레이션

### 2.1 일람표 (본 phase 신규 2개)

| 번호 | 파일명 | 주요 객체 |
|---|---|---|
| 0017 | `0017_barcode_cache.sql` | table barcode_cache (barcode PK, product_name, brand, default_category_id FK, payload jsonb, fetched_at) |
| 0018 | `0018_receipt_uploads.sql` | enum ocr_status (pending/processing/done/failed) + table receipt_uploads (user_id, storage_path, status, parsed_items jsonb, error_message) |

### 2.2 본문

#### 0017_barcode_cache.sql

<!-- SOURCE: apps/web/supabase/migrations/0017_barcode_cache.sql -->
```sql
create table barcode_cache (
  barcode text primary key,
  product_name text,
  brand text,
  default_category_id uuid references ingredient_categories(id),
  payload jsonb,                          -- 원본 응답
  fetched_at timestamptz not null default now()
);
```

#### 0018_receipt_uploads.sql

<!-- SOURCE: apps/web/supabase/migrations/0018_receipt_uploads.sql -->
```sql
create type ocr_status as enum ('pending', 'processing', 'done', 'failed');

create table receipt_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,             -- supabase storage 경로
  status ocr_status not null default 'pending',
  parsed_items jsonb,                     -- OCR 결과 [{name, qty, ...}]
  error_message text,
  created_at timestamptz not null default now()
);
create index receipt_uploads_user_idx on receipt_uploads(user_id, created_at desc);
```

### 2.3 RLS

| 테이블 | RLS 패턴 | 상세 |
|---|---|---|
| `barcode_cache` | read-only seed (db-schema.md §4.3) | `select to authenticated using (true)`. INSERT/UPDATE 없음 → admin client (service_role) RLS bypass로만 write |
| `receipt_uploads` | 사용자별 격리 (db-schema.md §4.1) | `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)` |

Supabase Storage 버킷: `receipts/` (사용자별 폴더 정책 `receipts/{user_id}/` + 30일 lifecycle policy).

### 2.4 데이터 백필

없음 (신규 테이블).

---

## §3 UI 작업

### 3.1 features/scan-barcode (신규)

| 파일 | 설명 |
|---|---|
| `features/scan-barcode/api/scan-barcode-action.ts` | Server Action — 코드 받아 cache lookup → API → master INSERT 또는 매칭. `Result<{ ingredientMasterId: string; isNew: boolean }, string>` 반환 |
| `features/scan-barcode/lib/use-barcode-bridge.ts` | webview 메시지 hook — `BARCODE_SCAN_RESULT` 수신, RN native scan 결과 처리 |
| `features/scan-barcode/lib/lookup-barcode.ts` | 식약처 API 호출 + barcode_cache write (server util, Route Handler 내부에서만 호출) |
| `features/scan-barcode/ui/scan-barcode-button.tsx` | 모바일에서만 표시 (UA 감지 기반). `BARCODE_SCAN_REQUEST` 메시지 전송 |
| `features/scan-barcode/ui/manual-barcode-input.tsx` | 데스크탑 fallback — 바코드 코드 직접 입력 폼 |

### 3.2 features/scan-receipt (신규)

| 파일 | 설명 |
|---|---|
| `features/scan-receipt/api/process-receipt-action.ts` | Server Action — OCR 결과(parsedItems) 받아 user_ingredients 일괄 INSERT confirmation. `Result<{ added: number }, string>` 반환 |
| `features/scan-receipt/api/upload-and-queue.ts` | Server Action (데스크탑용) — 이미지 → Storage 업로드 → receipt_uploads row INSERT(status=pending) → `/api/ocr/receipt` 에 receipt_id 전달 |
| `features/scan-receipt/lib/use-ocr-bridge.ts` | webview OCR 메시지 hook — `OCR_RECEIPT_RESULT` / `OCR_RECEIPT_ERROR` 수신 처리 |
| `features/scan-receipt/lib/parseReceiptText.ts` | OCR text lines → 품목/수량 파싱 (한국 마트 영수증 형식 지원) |
| `features/scan-receipt/ui/receipt-capture.tsx` | 모바일: `OCR_RECEIPT_REQUEST` 메시지 전송. 데스크탑: file input → Storage 업로드 경로 |
| `features/scan-receipt/ui/receipt-review-dialog.tsx` | 파싱 결과 사용자 검수/수정/확정 dialog |

### 3.3 widgets/smart-input (신규)

| 파일 | 설명 |
|---|---|
| `widgets/smart-input/smart-input-menu.tsx` | "+" 버튼 클릭 시 메뉴 (수동 입력 / 바코드 스캔 / 영수증 촬영) |

### 3.4 pages (신규)

| 경로 | 설명 |
|---|---|
| `app/(app)/scan/barcode/page.tsx` | 바코드 스캔 결과 처리 페이지 |
| `app/(app)/scan/receipt/page.tsx` | 영수증 OCR 처리 페이지 |

---

## §4 로직 작업

### 4.1 Server Actions

```ts
// features/scan-barcode/api/scan-barcode-action.ts
scanBarcode(code: string): Promise<Result<{ ingredientMasterId: string; isNew: boolean }, string>>
// 1) barcode_cache 조회 (admin client)
// 2) cache miss → /api/barcode/lookup?code=... 호출
// 3) 매칭 성공 → ingredient_master_id 반환
// 4) 신규 INSERT 후 isNew: true 반환

// features/scan-receipt/api/process-receipt-action.ts
processReceipt(uploadId: string, parsedItems: ParsedItem[]): Promise<Result<{ added: number }, string>>
// 사용자 검수 완료 후 user_ingredients 일괄 INSERT (사용자 RLS context)
```

### 4.2 Route Handlers

```ts
// app/api/barcode/[code]/route.ts (GET)
// 1) barcode_cache hit → 즉시 반환
// 2) cache miss → 식약처 식품안전나라 OpenAPI 호출 (BARCODE_API_KEY)
// 3) 결과 → barcode_cache INSERT (admin client, 24h TTL)
// 4) 미발견 → { ok: false, error: 'not_found' }

// app/api/ocr/receipt/route.ts (POST, multipart)
// OCR_FALLBACK_ENABLED=false 시 즉시 { ok: false, error: '데스크탑 OCR 임시 비활성화' } 반환
// Supabase Storage에서 이미지 읽기
// Clova General OCR API 호출 (NAVER_CLOVA_OCR_API_KEY, NAVER_CLOVA_OCR_INVOKE_URL)
// 결과 파싱 (한국어 영수증 라인 → 품목명/수량/금액 추출)
// receipt_uploads.parsed_items 업데이트, status=done (admin client)
// 실패 시 status=failed + error_message
```

### 4.3 webview-protocol 통합

- `packages/webview-protocol/src/index.ts`에 `OcrMessage`, `BarcodeMessage` 타입 추가 (§0.5.4 참조)
- `use-barcode-bridge.ts`에 `BARCODE_SCAN_RESULT` / `BARCODE_SCAN_CANCEL` 핸들러 추가
- `use-ocr-bridge.ts`에 `OCR_RECEIPT_RESULT` / `OCR_RECEIPT_ERROR` / `OCR_RECEIPT_CANCEL` 핸들러 추가
- RN 측: `@react-native-ml-kit/text-recognition` native 모듈 통합 (별도 작업, EAS preview build 필요)

---

## §5 외부 API 연동

### 5.1 식약처 식품안전나라 OpenAPI (바코드)

- Endpoint: `https://openapi.foodsafetykorea.go.kr/api/{키}/{서비스명}/json/...`
- 일일 1000 호출 한도 (무료)
- 캐싱 24h (`barcode_cache` 24h TTL)
- 한도 초과 또는 미발견 시 → 사용자 수동 입력 fallback

### 5.2 Naver Clova General OCR (Plan B, 데스크탑 fallback)

- Endpoint: Clova OCR invoke URL (NAVER_CLOVA_OCR_INVOKE_URL 환경 변수)
- 종량제 (~₩4/호출, ~$4.5/월 @ 1500 호출 가정)
- `OCR_FALLBACK_ENABLED=true`일 때만 활성
- 비용 게이트 hit 시 `false`로 토글 → 즉시 비활성

### 5.3 Google ML Kit Text Recognition (모바일 메인)

- RN: `@react-native-ml-kit/text-recognition` 패키지
- On-device 처리 (네트워크 X, $0/월)
- 이미지 외부 전송 없음 → 개인정보 보호 우수
- apps/mobile에 native 모듈 추가 후 EAS preview build rebuild 필요

---

## §6 테스트 작업

### 6.1 단위 테스트

| 파일 | 내용 |
|---|---|
| `features/scan-receipt/lib/parseReceiptText.spec.ts` | 한국 마트 영수증 fixture 5장 (이마트/홈플러스/롯데마트/CU/GS25) → 품목 배열 파싱 검증 |
| `features/scan-barcode/lib/lookup-barcode.spec.ts` | barcode_cache hit / cache miss 분기 테스트 |

### 6.2 통합 테스트

| 시나리오 | 검증 내용 |
|---|---|
| `scanBarcode` — 매칭 성공 | 바코드 → barcode_cache hit → ingredient_master_id 반환 확인 |
| `scanBarcode` — 신규 INSERT | barcode_cache miss → API 호출 → ingredient_master 신규 row INSERT 확인 |
| `processReceipt` | parsedItems → user_ingredients 일괄 INSERT 수 확인 |

### 6.3 E2E (Playwright)

데스크탑 fallback 경로만 자동화 가능 (모바일 native 카메라는 수동).

| 파일 | 내용 |
|---|---|
| `e2e/smart-input-desktop.spec.ts` | 수동 바코드 입력 → ingredient_master 매칭 / 영수증 이미지 업로드 → OCR 결과 mock → 일괄 등록 확인 |

### 6.4 수동 smoke (모바일, EAS preview build 필요)

- [ ] 바코드 스캔 → 상품정보 표시 → user_ingredients INSERT 확인
- [ ] 영수증 촬영 → ML Kit OCR → 5개 이상 품목 파싱 → 일괄 등록 확인
- [ ] `OCR_RECEIPT_ERROR` 발생 시 에러 메시지 표시 확인

---

## §7 Acceptance 기준

- [ ] **PoC 1일 통과**: ML Kit + Clova 영수증 5장 정확도 ≥ 70% (둘 중 한 쪽). 미달 시 phase deferred. 결과 `docs/CHANGELOG.md` Phase 6 섹션 기록.
- [ ] **비용 게이트**: 월 예상 $5 이하 (DAU × 영수증 × 30 < 2000). 초과 예상 시 `OCR_FALLBACK_ENABLED=false` 토글.
- [ ] 0017/0018 마이그레이션 적용 완료
- [ ] 바코드 스캔 → 캐시 hit 시 0.5초 내 상품명 표시
- [ ] 바코드 매칭 성공 시 `ingredient_master_id` 반환, 미매칭 시 신규 INSERT + `isNew: true`
- [ ] 영수증 OCR 모바일 경로 동작 (native ML Kit, webview-protocol 메시지 정상)
- [ ] 영수증 OCR 데스크탑 fallback 동작 (`OCR_FALLBACK_ENABLED=true`일 때) — 결과 < 10초
- [ ] `OCR_FALLBACK_ENABLED=false` 시 수동 입력 폴백 UX 표시
- [ ] parsed_items 사용자 검수/수정 가능 (`receipt-review-dialog`)
- [ ] 일괄 등록 후 user_ingredients 정상 INSERT 확인
- [ ] 영수증 이미지 Storage 30일 lifecycle 자동 삭제 정책 적용
- [ ] 모든 Server Action `Result<T, string>` 패턴 준수
- [ ] webview-protocol OCR/Barcode 메시지 7개 정상 동작

---

## §8 Definition of Done

- [ ] 모든 §7 Acceptance 기준 통과
- [ ] `pnpm web typecheck` 0 에러
- [ ] `pnpm web lint` 0 에러
- [ ] `pnpm web db:check-drift` 통과 (0017, 0018 drift 없음)
- [ ] `pnpm web test` 단위 + 통합 통과
- [ ] E2E (데스크탑 경로) 통과
- [ ] **모바일 웹뷰 스모크 (★ 본 phase 핵심)**: EAS preview build → ML Kit OCR + 바코드 스캔 native 동작 확인 (§6.4 체크리스트)
- [ ] webview-protocol 패키지 버전 minor bump
- [ ] git tag `v0.6.0`

### 8.5 롤백

| 항목 | 롤백 방법 |
|---|---|
| ML Kit native 모듈 | `@react-native-ml-kit/text-recognition` 제거 → apps/mobile EAS rebuild 필요 |
| Clova fallback 즉시 비활성 | `OCR_FALLBACK_ENABLED=false` 환경 변수 토글 → 재배포 없이 즉시 적용 |
| barcode_cache / receipt_uploads | 새 마이그레이션으로 schema 변경 (기존 0017/0018 직접 수정 금지 — immutable) |
| 코드 전체 | `git revert` 또는 `v0.5.0` 태그로 롤백 |

---

## §9 위험 / 완화

| 위험 | 완화 |
|---|---|
| ML Kit 정확도 부족 | PoC 1일에 실측. 미달 시 Clova 메인 전환 검토. 비용 게이트 동시 hit 시 phase deferred |
| Clova 비용 초과 | $5/월 게이트. 일주일 운영 측정 → `OCR_FALLBACK_ENABLED=false` 토글로 즉시 비활성 |
| 식약처 API 1000회/일 한도 초과 | barcode_cache 24h TTL 캐싱. cache miss 시에만 API 호출. 한도 초과 시 사용자 수동 입력 fallback |
| 영수증 텍스트 파싱 정확도 (마트별 형식 차이) | 5개 마트 fixture로 단위 테스트. 사용자 검수/수정 dialog 제공 |
| 모바일 native 모듈 빌드 실패 | EAS preview build 1회 검증 + DoD 게이트 필수 통과. 실패 시 release 차단 |
| 개인정보 (영수증 카드번호/이름 등) | ML Kit 사용 시 이미지 외부 전송 없음(on-device). 데스크탑 Clova 경로: Storage 업로드 후 30일 lifecycle 삭제. OCR raw text는 client local 저장 없음. parsed_items만 서버 전송. |
| Phase ROI 미충족 | Phase 5 종료 후 DAU × 영수증 × 30 계산. 부정적이면 phase deferred (무기한). 트리거 룰은 개발 착수 조건이기도 함. |

### 9.5 관측

| 관측 항목 | 도구/방법 |
|---|---|
| OCR 호출 빈도 + 응답 시간 | Vercel logs (비용 월 환산용) |
| 바코드 cache hit율 | `barcode_cache.fetched_at` 기반 월간 측정 |
| `receipt_uploads.status='failed'` 누적 | Supabase 대시보드 쿼리 |
| 비용 게이트 접근 경보 | 일주일 OCR 빈도 × 4 = 월 예상 → $4 초과 시 토글 검토 |

---

## (선택) 일별 작업 계획

| 일차 | 내용 |
|---|---|
| Day 1 | PoC: ML Kit + Clova 영수증 5장씩 정확도 측정 + 비용 산정. CHANGELOG 기록. phase 진행 여부 결정. |
| Day 2 | 0017 + 0018 마이그레이션 작성 + 적용 + RLS. 식약처 API 키 발급 신청(1–3일 소요 예상). |
| Day 3–4 | webview-protocol OcrMessage/BarcodeMessage 확장 + 패키지 버전 bump. scan-barcode feature 구현 (Route Handler + Server Action + UI). |
| Day 5–7 | scan-receipt feature 구현 (parseReceiptText + OCR bridge + receipt-capture + review-dialog). |
| Day 8–9 | RN native 모듈(`@react-native-ml-kit/text-recognition`) 통합 + EAS preview build 1차. |
| Day 10–12 | 모바일 웹뷰 스모크 테스트 + 데스크탑 fallback E2E (Playwright). |
| Day 13–14 | 비용 모니터링 일주일 측정 시작 + git tag v0.6.0 + CHANGELOG 최종 업데이트. |

---

## (선택) 모바일 상세

[Architect 권고 5 하이브리드 흐름 기반]

**ML Kit 네이티브 통합 절차**:
1. `apps/mobile/package.json`에 `@react-native-ml-kit/text-recognition` 추가
2. iOS: `Podfile` + `pod install` (EAS build에서 자동)
3. Android: `build.gradle` 확인 (ML Kit 의존성 자동 포함)
4. EAS preview build 1회 실행 → APK 다운 → sideload → 스모크 테스트

**카메라 권한 처리**:
- Android: `CAMERA` 권한 manifest 추가
- 권한 거부 시: "카메라 권한이 필요합니다. 설정에서 허용해 주세요." 안내 다이얼로그

**webview-protocol 양방향 메시지 검증**:
1. Web → RN: `OCR_RECEIPT_REQUEST` 메시지 전송 확인
2. RN → Web: `OCR_RECEIPT_RESULT` (lines, raw, ts) 수신 확인
3. 에러 케이스: `OCR_RECEIPT_ERROR` + `OCR_RECEIPT_CANCEL` 핸들링 확인
4. 바코드: `BARCODE_SCAN_REQUEST` → `BARCODE_SCAN_RESULT` (code, format) 흐름 확인
