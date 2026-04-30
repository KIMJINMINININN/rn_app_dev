import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '인벤토리',
};

export default async function InventoryPage() {
  return (
    <div className="px-16 py-24">
      <p className="text-body-m-400 text-gray-700">Phase 1에서 구현 예정</p>
    </div>
  );
}
