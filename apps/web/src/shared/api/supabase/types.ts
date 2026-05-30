/**
 * Supabase 생성 타입 placeholder.
 *
 * 실제 타입은 인프라 단계에서 `pnpm web db:types`로 생성한다
 * (`supabase gen types typescript --linked`가 이 파일을 통째로 덮어씀).
 * 그 전까지 server/client/admin 클라이언트가 `Database` 제네릭을 참조할 수 있도록
 * 최소 골격만 둔다.
 *
 * SSoT: docs/mma/Develop.md §4.7 / §6.5
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** placeholder — `db:types` 생성물로 대체될 빈 스키마 */
export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
