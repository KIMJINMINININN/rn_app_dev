'use client';

// apps/web/src/features/manual-add-shopping/ui/add-shopping-dialog.tsx
// Phase 5 §3.4 — 수동 항목 추가 다이얼로그.
//
// 책임:
//   - Dialog (Phase 0b primitive) + form (name 필수, quantity/unit 선택)
//   - Submit → addManualShoppingItem Server Action 호출
//   - 성공: toast + 폼 초기화 + onClose
//   - 실패: toast.error + 다이얼로그 유지

import { useState, useTransition } from 'react';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

import { addManualShoppingItem } from '../api/actions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddShoppingDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setName('');
    setQuantity('');
    setUnit('');
  };

  const handleClose = (next: boolean) => {
    if (isPending && next === false) return;
    if (next === false) reset();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('재료 이름을 입력하세요');
      return;
    }
    const qtyNum = quantity.trim().length > 0 ? Number(quantity) : null;
    if (qtyNum != null && (Number.isNaN(qtyNum) || qtyNum < 0)) {
      toast.error('수량은 0 이상의 숫자만 입력 가능합니다');
      return;
    }

    startTransition(async () => {
      const res = await addManualShoppingItem({
        name: trimmedName,
        quantity: qtyNum,
        unit: unit.trim().length > 0 ? unit.trim() : null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`'${res.value.custom_name}' 추가됨`);
      reset();
      onOpenChange(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="장바구니 항목 추가"
      description="직접 입력한 재료를 장바구니에 추가합니다"
    >
      <div className="flex flex-col gap-16">
        <Input
          label="재료 이름"
          placeholder="예: 양파"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          maxLength={80}
        />
        <div className="flex gap-8">
          <div className="flex-1">
            <Input
              label="수량 (선택)"
              type="number"
              placeholder="예: 2"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="flex-1">
            <Input
              label="단위 (선택)"
              placeholder="예: 개"
              value={unit}
              onChange={(e) => setUnit(e.target.value.slice(0, 20))}
              maxLength={20}
            />
          </div>
        </div>

        <div className="flex justify-end gap-8 pt-8">
          <Button
            variant="ghost"
            size="md"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={isPending}
          >
            추가
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
