export type Commerce = 'coupang' | 'kurly' | 'bmart';

export function buildCommerceUrl(commerce: Commerce, ingredientName: string): string {
  if (!ingredientName) return '';

  if (commerce === 'coupang') {
    if (process.env.NEXT_PUBLIC_COUPANG_ENABLED === 'false') return '';
    return `https://www.coupang.com/np/search?q=${encodeURIComponent(ingredientName)}`;
  }

  if (commerce === 'kurly') {
    if (process.env.NEXT_PUBLIC_KURLY_ENABLED === 'false') return '';
    return `https://www.kurly.com/search?sword=${encodeURIComponent(ingredientName)}`;
  }

  // bmart: web deeplink 미지원 (Pre-flight 결과)
  if (commerce === 'bmart') {
    if (process.env.NEXT_PUBLIC_BAEMIN_ENABLED !== 'true') return '';
    console.warn('[buildCommerceUrl] bmart web deeplink is not supported');
    return '';
  }

  return '';
}
