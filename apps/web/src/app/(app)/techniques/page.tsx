import Link from 'next/link';

import type { Technique } from '@/entities/technique';
import { TechniqueLibrary } from '@/features/technique-library';
import { PlusIcon } from '@/shared/ui';

/**
 * 기술 라이브러리 목록 (F4 / Design §7d).
 *
 * 헤더("기술 라이브러리" + "기술 추가" 스텁) + TechniqueLibrary(필터/정렬 + 카드 그리드).
 * 필터(종목·분류·포지션·벨트)와 정렬(최근·이름)은 **동작**한다(client 아일랜드).
 *
 * 데이터 휴면(infra 전): techniques=[](빈 배열)을 client 아일랜드에 내린다 — 결과는
 * 비어 EmptyState 로 떨어진다(가짜 레코드 금지, calendar-screen 패턴과 동일).
 * page 는 searchParams/Supabase 를 읽지 않아 /techniques 라우트가 정적(static)으로 유지된다.
 *
 * "기술 추가"는 /techniques/new 생성 폼(F4-AC1, widgets/technique-editor)으로 연결한다.
 * Button 원자는 <button> 전용이라(컴포넌트 분리), Link를 Button primary/sm 토큰 클래스로 스타일링한다.
 */
export default function TechniquesPage() {
  // TODO(infra): RSC fetch techniques (또는 client query). 지금은 dormant.
  const techniques: Technique[] = [];

  return (
    <section aria-labelledby="techniques-heading" className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 id="techniques-heading" className="text-heading-l text-[var(--text-strong)]">
          기술 라이브러리
        </h1>
        {/* 기술 추가 → 생성 폼(F4-AC1). Button primary/sm 토큰을 그대로 입은 Link(저장은 도먼시). */}
        <Link
          href="/techniques/new"
          className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-xxs px-2.5 text-button-s font-medium select-none bg-[var(--primary)] text-[var(--text-on-primary)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus-visible:shadow-[var(--ring-focus)]"
        >
          <PlusIcon width={16} height={16} />
          기술 추가
        </Link>
      </div>

      <TechniqueLibrary techniques={techniques} />
    </section>
  );
}
