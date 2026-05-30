import { z } from 'zod';
import {
  CLASS_TYPES,
  DISCIPLINES,
  VISIBILITIES,
  type Discipline,
} from '@/shared/model/enums';
import { isoTimestamp } from '@/shared/lib/zod';

/**
 * 훈련 세션 모델 — `sessions` 테이블과 1:1 (마이그레이션 0006_sessions.sql).
 * 컬럼명은 DB 그대로 snake_case 유지 (향후 db:types 생성물과 정합).
 * (PRD F2/F3 / Develop §4.3)
 */

/** 'YYYY-MM-DD' (DB `date` 타입, KST 날짜) */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const sessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  /** 캘린더 기본 단위 (KST 날짜) — DB `date not null` */
  trained_on: z.string().regex(DATE_REGEX, 'YYYY-MM-DD 형식이어야 합니다'),
  /** 체육관/장소 */
  gym: z.string().nullable(),
  class_type: z.enum(CLASS_TYPES).nullable(),
  duration_min: z.number().int().min(0).nullable(),
  intensity: z.number().int().min(1).max(5).nullable(),
  rounds: z.number().int().min(0).nullable(),
  /** 자유 텍스트 */
  partners: z.string().nullable(),
  /** 요약 메모 (PRD F6) */
  memo_md: z.string().nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  visibility: z.enum(VISIBILITIES),
  created_at: isoTimestamp,
  updated_at: isoTimestamp,
});
export type Session = z.infer<typeof sessionSchema>;

/**
 * 세션 ↔ 종목 N:M — `session_disciplines` 테이블과 1:1 (마이그레이션 0006).
 * 한 훈련에 복수 종목 (PRD §4.1).
 */
export const sessionDisciplineSchema = z.object({
  session_id: z.string().uuid(),
  discipline: z.enum(DISCIPLINES),
});
export type SessionDiscipline = z.infer<typeof sessionDisciplineSchema>;

/** 조회 편의용 합성 타입 — 세션 + 연결된 종목 목록 */
export type SessionWithDisciplines = Session & {
  disciplines: Discipline[];
};

/**
 * 신규 입력용 스키마 — 서버 생성 컬럼(id/user_id/created_at/updated_at) 제외,
 * 종목 배열을 함께 받는다 (세션과 session_disciplines를 한 번에 입력).
 */
export const sessionInsertSchema = sessionSchema
  .omit({
    id: true,
    user_id: true,
    created_at: true,
    updated_at: true,
  })
  .extend({
    disciplines: z.array(z.enum(DISCIPLINES)),
  });
export type SessionInsert = z.infer<typeof sessionInsertSchema>;
