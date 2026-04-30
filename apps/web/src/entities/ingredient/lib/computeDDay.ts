import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { SOON_THRESHOLD_DAYS, URGENT_THRESHOLD_DAYS } from './dday-thresholds';

dayjs.extend(utc);
dayjs.extend(timezone);

export type DDayBucket = 'expired' | 'urgent' | 'soon' | 'fine';

export interface DDayInfo {
  days: number | null;
  bucket: DDayBucket;
}

export function computeDDay(
  expiresAt: string | null | undefined,
  now: Date | string = new Date(),
): DDayInfo {
  if (!expiresAt) return { days: null, bucket: 'fine' };

  const today = dayjs.tz(now, 'Asia/Seoul').startOf('day');
  const expiry = dayjs.tz(expiresAt, 'Asia/Seoul').startOf('day');
  const days = expiry.diff(today, 'day');

  if (days < 0) return { days, bucket: 'expired' };
  if (days <= URGENT_THRESHOLD_DAYS) return { days, bucket: 'urgent' };
  if (days <= SOON_THRESHOLD_DAYS) return { days, bucket: 'soon' };
  return { days, bucket: 'fine' };
}
