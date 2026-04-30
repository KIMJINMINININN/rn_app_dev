import { Card } from '@/shared/ui/card';

export function StorageCard({
  name,
  count,
}: {
  name: string;
  count: number;
}) {
  return (
    <Card padding="md" className="flex items-center justify-between">
      <span className="text-heading-xs text-gray-900">{name}</span>
      <span className="text-body-s-400 text-gray-600">{count}개</span>
    </Card>
  );
}
