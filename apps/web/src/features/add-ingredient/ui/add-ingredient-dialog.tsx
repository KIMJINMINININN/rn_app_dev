'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';

import type { StorageLocation } from '@/entities/ingredient/model/types';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

import { addIngredient } from '../api/addIngredient';
import { useIngredientTypeahead } from '../lib/useTypeahead';

interface SelectedMaster {
  id: string;
  name: string;
  default_shelf_life_days: number | null;
  default_storage_kind: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  storageLocations: StorageLocation[];
}

export function AddIngredientDialog({
  open,
  onOpenChange,
  userId,
  storageLocations,
}: Props) {
  const [step, setStep] = useState<'search' | 'detail'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaster, setSelectedMaster] = useState<SelectedMaster | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('개');
  const [expiresAt, setExpiresAt] = useState('');
  const [storageLocationId, setStorageLocationId] = useState(
    storageLocations[0]?.id ?? '',
  );

  const { data: searchResults = [], isFetching } = useIngredientTypeahead(
    searchQuery,
    userId,
  );

  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setStep('search');
    setSearchQuery('');
    setSelectedMaster(null);
    setQuantity('1');
    setUnit('개');
    setExpiresAt('');
    setStorageLocationId(storageLocations[0]?.id ?? '');
  }

  function selectMaster(r: {
    id: string;
    name: string;
    default_shelf_life_days: number | null;
    default_storage_kind: string | null;
  }) {
    setSelectedMaster({
      id: r.id,
      name: r.name,
      default_shelf_life_days: r.default_shelf_life_days,
      default_storage_kind: r.default_storage_kind,
    });
    setStep('detail');
    if (r.default_shelf_life_days) {
      const d = new Date();
      d.setDate(d.getDate() + r.default_shelf_life_days);
      setExpiresAt(d.toISOString().slice(0, 10));
    }
    if (r.default_storage_kind) {
      const matched = storageLocations.find(
        (s) => s.kind === r.default_storage_kind,
      );
      if (matched) setStorageLocationId(matched.id);
    }
  }

  function submit() {
    if (!selectedMaster || !storageLocationId) return;

    startTransition(async () => {
      const result = await addIngredient({
        ingredient_master_id: selectedMaster.id,
        storage_location_id: storageLocationId,
        quantity,
        unit,
        expires_at: expiresAt || null,
      });

      if (result.ok) {
        toast.success(`${selectedMaster.name}이(가) 추가되었습니다`);
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        resetForm();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
      title="식재료 추가"
      description={
        step === 'search'
          ? '추가할 식재료를 검색해주세요'
          : selectedMaster?.name
      }
    >
      {step === 'search' ? (
        <div className="flex flex-col gap-12">
          <Input
            label="이름"
            placeholder="예: 양파, 우유"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <ul className="max-h-240 overflow-auto rounded-s border border-gray-200">
            {isFetching && (
              <li className="px-12 py-8 text-body-s-400 text-gray-500">
                검색 중…
              </li>
            )}
            {!isFetching &&
              searchResults.length === 0 &&
              searchQuery.trim() && (
                <li className="px-12 py-8 text-body-s-400 text-gray-500">
                  결과 없음
                </li>
              )}
            {searchResults.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-12 py-8 text-left transition-colors hover:bg-gray-50"
                  onClick={() => selectMaster(r)}
                >
                  <span className="text-body-m-400 text-gray-900">
                    {r.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <div className="flex gap-8">
            <div className="flex-1">
              <Input
                label="수량"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="w-80">
              <Input
                label="단위"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <Input
            label="유통기한"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            helper={
              selectedMaster?.default_shelf_life_days
                ? `기본 ${selectedMaster.default_shelf_life_days}일`
                : '미입력 시 무기한'
            }
          />
          <div className="flex flex-col gap-4">
            <label
              htmlFor="storage"
              className="text-body-s-500 text-gray-700"
            >
              보관 장소
            </label>
            <select
              id="storage"
              value={storageLocationId}
              onChange={(e) => setStorageLocationId(e.target.value)}
              className="h-40 rounded-xs border border-gray-300 bg-white px-12 text-body-m-400 text-gray-900"
            >
              {storageLocations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-8">
            <div className="flex-1">
              <Button variant="ghost" size="md" onClick={() => setStep('search')}>
                뒤로
              </Button>
            </div>
            <div className="flex-1">
              <Button
                variant="primary"
                size="md"
                onClick={submit}
                loading={isPending}
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
