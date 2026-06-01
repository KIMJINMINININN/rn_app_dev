import { CalendarScreen } from './calendar-screen';

/**
 * 캘린더 홈 (F2 / Design §7a·§7b·§8) — 얇은 서버 컴포넌트.
 *
 * 상태/날짜/인터랙션은 전부 클라이언트 아일랜드(CalendarScreen)가 소유한다.
 * ⚠️ 여기서 searchParams를 읽지 않는다 — 라우트를 정적(static)으로 유지하고
 *    (app) 레이아웃의 인증 휴면(NEXT_PUBLIC_AUTH_ENABLED=false) 정적 프리렌더와 정합.
 *    딥링크(?date)는 CalendarScreen의 TODO(deep-link)에서 클라이언트로 처리 예정.
 */
export default function CalendarPage() {
  return <CalendarScreen />;
}
