import { Skeleton } from '@/shared/ui/skeleton';

export default function InventoryLoading() {
  return (
    <div className="flex flex-col gap-12 px-16 py-16">
      <div className="flex items-center justify-between pt-16">
        <Skeleton variant="text" width={140} height={32} />
        <Skeleton variant="rect" width={80} height={32} />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-8">
          <Skeleton variant="rect" height={56} />
          <Skeleton variant="rect" height={80} />
        </div>
      ))}
    </div>
  );
}
