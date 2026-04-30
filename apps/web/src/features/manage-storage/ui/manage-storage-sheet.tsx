'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';

import type { StorageLocation } from '@/entities/ingredient/model/types';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

import {
  addStorage,
  deleteStorage,
  renameStorage,
} from '../api/manageStorage';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storageLocations: StorageLocation[];
}

export function ManageStorageSheet({
  open,
  onOpenChange,
  storageLocations,
}: Props) {
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const refresh = () => {
    // storageLocations은 SSR 프롭 — revalidatePath('/inventory')가 갱신 담당.
    // 클라이언트 캐시는 ['ingredients']만 갱신 필요.
    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
  };

  const addM = useMutation({
    mutationFn: addStorage,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`'${result.value.name}' 추가됨`);
        setNewName('');
        refresh();
      } else {
        toast.error(result.error);
      }
    },
  });

  const renameM = useMutation({
    mutationFn: renameStorage,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('이름 변경됨');
        setRenameTarget(null);
        refresh();
      } else {
        toast.error(result.error);
      }
    },
  });

  const deleteM = useMutation({
    mutationFn: deleteStorage,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('삭제됨');
        refresh();
      } else {
        toast.error(result.error);
      }
    },
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(() => {
      addM.mutate({ name: newName.trim(), kind: 'custom' });
    });
  };

  const handleRename = () => {
    if (!renameTarget || !renameTarget.name.trim()) return;
    startTransition(() => {
      renameM.mutate({
        id: renameTarget.id,
        name: renameTarget.name.trim(),
      });
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`'${name}' 삭제하시겠어요?`)) return;
    startTransition(() => {
      deleteM.mutate({ id });
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="보관 장소 관리"
      description="보관 장소를 추가하거나 변경하세요"
    >
      <div className="flex flex-col gap-16">
        <div className="flex flex-col gap-8">
          <p className="text-body-s-500 text-gray-700">새 보관 장소 추가</p>
          <div className="flex gap-8">
            <div className="flex-1">
              <Input
                placeholder="예: 와인셀러"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleAdd}
              loading={isPending}
            >
              추가
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <p className="text-body-s-500 text-gray-700">기존 보관 장소</p>
          <ul className="flex flex-col gap-4">
            {storageLocations.map((s) => {
              const isRenaming = renameTarget?.id === s.id;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-8 rounded-xs border border-gray-200 bg-white px-12 py-8"
                >
                  {isRenaming ? (
                    <>
                      <div className="flex-1">
                        <Input
                          value={renameTarget.name}
                          onChange={(e) =>
                            setRenameTarget({
                              ...renameTarget,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleRename}
                        loading={isPending}
                      >
                        저장
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenameTarget(null)}
                      >
                        취소
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-body-m-400 text-gray-900">
                        {s.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenameTarget({ id: s.id, name: s.name })}
                      >
                        이름 변경
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(s.id, s.name)}
                      >
                        삭제
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}
