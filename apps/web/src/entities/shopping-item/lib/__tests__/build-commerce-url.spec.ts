import { describe, expect, it, vi } from 'vitest';

import { buildCommerceUrl } from '../build-commerce-url';

describe('buildCommerceUrl', () => {
  it('쿠팡 URL — 한글 인코딩', () => {
    const url = buildCommerceUrl('coupang', '양파');
    expect(url).toBe('https://www.coupang.com/np/search?q=%EC%96%91%ED%8C%8C');
  });

  it('마켓컬리 URL — sword 파라미터 한글 인코딩', () => {
    const url = buildCommerceUrl('kurly', '두부');
    expect(url).toBe('https://www.kurly.com/search?sword=%EB%91%90%EB%B6%80');
  });

  it('NEXT_PUBLIC_COUPANG_ENABLED=false 시 빈 문자열 반환', () => {
    vi.stubEnv('NEXT_PUBLIC_COUPANG_ENABLED', 'false');
    try {
      const url = buildCommerceUrl('coupang', '양파');
      expect(url).toBe('');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('NEXT_PUBLIC_BAEMIN_ENABLED 디폴트 false — bmart 빈 문자열 반환', () => {
    // env 미설정(undefined) → !== 'true' → 빈 문자열
    vi.stubEnv('NEXT_PUBLIC_BAEMIN_ENABLED', '');
    try {
      const url = buildCommerceUrl('bmart', '양파');
      expect(url).toBe('');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('빈 ingredientName → 빈 문자열 반환', () => {
    expect(buildCommerceUrl('coupang', '')).toBe('');
    expect(buildCommerceUrl('kurly', '')).toBe('');
    expect(buildCommerceUrl('bmart', '')).toBe('');
  });

  it('NEXT_PUBLIC_KURLY_ENABLED=false 시 빈 문자열 반환', () => {
    vi.stubEnv('NEXT_PUBLIC_KURLY_ENABLED', 'false');
    try {
      const url = buildCommerceUrl('kurly', '김치');
      expect(url).toBe('');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
