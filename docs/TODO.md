# 내일 이어할 TODO

> 작성: 2026-04-29 18:30 KST
> 브랜치: `feature/smart-refrigerator`
> 마지막 commit: `8cd2ed0 chore(phase-0a): supabase init`

---

## 0. 컨텍스트 빠른 복기 (claude가 읽을 부분)

- **PLAN.md 분할 작업 완료** (Stage 1-6, commit `49e3839`까지)
- **Phase 0a Day 1 진행 중** — 0001/0002 마이그레이션 작성 + push까지 완료. 트리거 검증 단계에서 stop.
- **supabase CLI 시스템 설치됨** (`/opt/homebrew/bin/supabase` v2.95.4 via brew)
- **Supabase project linked + db push 완료** (사용자 환경에서 실행 끝남)
- 다음 진행: 트리거 검증 → Day 2 → Day 3 → Phase 0b → Phase 1...

---

## 1. 첫 액션 — 트리거 검증 SQL 3개

Supabase 대시보드 → SQL Editor에서 실행. 각 결과 claude에게 공유:

```sql
-- 1) handle_new_user 함수가 정의됐는가? (security definer + search_path 확인)
select proname, prosecdef, proconfig
from pg_proc
where proname = 'handle_new_user';

-- 2) on_auth_user_created 트리거 검색
select tgname, tgenabled, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgname = 'on_auth_user_created';

-- 3) auth.users 사용자 수
select id, email, email_confirmed_at, created_at from auth.users;
```

**시나리오 분기**:
- 함수 + 트리거 모두 정상 → 새 가입 1번 (또는 기존 사용자 backfill) → `user_profiles` row 확인 → Day 2 진행
- 둘 중 하나라도 누락 → 0002 마이그레이션 push 결과 재확인 (`supabase migration list --linked`)

---

## 2. Day 2 ralph 호출 (검증 통과 후)

```
/oh-my-claudecode:ralph
```

args 핵심 (claude가 알아서 작성):
- Phase 0a Day 2: types codegen + 3 supabase 클라이언트 generic + Result 헬퍼 + page.tsx 정리 + metadata 한글화
- 작업 위치: `apps/web/src/{shared/api/supabase, shared/lib, app/page.tsx, app/layout.tsx}`
- `pnpm web db:types` 실행 → `apps/web/src/shared/api/supabase/types.ts` 생성 (커밋 포함)
- 끝에 architect verification + 사용자 review

---

## 3. Day 3 ralph 호출 (Day 2 완료 후)

```
/oh-my-claudecode:ralph
```

- Phase 0a Day 3: `(app)` 라우트 그룹 생성 + 인증 가드 layout + `app/account/` → `app/(app)/account/` 이동 + `dark:` 클래스 제거 + 가입 회귀 검증

---

## 4. 그 다음 (Phase 0a 완료 후)

순서대로 ralph 호출 (각 phase 끝에 사용자 review):

1. **Phase 0b** — App Shell + Primitives 7종 + 테스트 인프라 + Lefthook (`docs/plans/phase-0b.md`)
2. **Phase 1** ★ MVP — 인벤토리 CRUD (`docs/plans/phase-1.md`)
   - 사전: PG 15+ 확인 (Supabase 콘솔 SQL `select version();`) — 미만이면 partial unique index 패턴 사용
   - 첫 30분: pg_trgm 한국어 typeahead PoC ("양"/"양파"/"양ㅍ")
3. Phase 2 / 3 (병렬 가능) → Phase 4 → Phase 5 → Phase 6

상세는 각 `docs/plans/phase-N.md` 참고. ralph는 `docs/plans/phase-N.md` + `db-schema.md` + `conventions.md` + `PRD.md` 4개만으로 자율 실행됨.

---

## 5. claude 호출 패턴 메모

- ralph 끝에 architect verification → 사용자 review 시점에서 stop
- review OK → commit + 다음 stage
- 한 phase 너무 크면 일별로 쪼개기 (Day 1/2/3) — phase 파일 §10 일별 분배 참조
- ralph 자율 실행 중 사용자 환경 액션 필요 시 (OAuth, 외부 키 발급 등) claude가 안내하고 멈춤

---

## 6. 알면 좋은 것

- **시크릿 보호**: `.env.local` 직접 노출 금지 (메모리 룰). project ref(`hxzoaefjqlgznqfgircf`)도 향후 안 보여줘도 됨 — link 끝났으니
- **pnpm v10 + supabase**: pnpm은 supabase 패키지 build script 차단. `pnpm web db:*` 스크립트가 작동하려면 brew로 시스템 설치 필요 (이미 됨)
- **drift checker**: `pnpm web db:check-drift` — 매 phase DoD 항목. 마이그레이션 ↔ db-schema.md ↔ phase-*.md 일관성 자동 검증
- **이메일 confirm**: Supabase 콘솔에서 OFF로 끄면 가입 즉시 session 발급 → 트리거 검증/회귀 테스트 편함
- **kjm9597@gmail.com**: 0002 적용 전 가입자라 user_profiles row 없음 (트리거 미동작). 필요 시 삭제 후 재가입 OR manual INSERT

---

## 시작 명령 (내일 첫 줄)

```
docs/TODO.md 읽어줘. 어디서 멈췄는지 확인하고 1번 검증부터 시작하자.
```
