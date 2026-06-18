'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ConversationStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: ConversationStatus; label: string; color: string }[] = [
  { value: 'OPEN', label: 'Aberta', color: 'text-blue-400' },
  { value: 'IN_PROGRESS', label: 'Em andamento', color: 'text-wm-green' },
  { value: 'WAITING', label: 'Aguardando', color: 'text-wm-yellow' },
  { value: 'RESOLVED', label: 'Resolvida', color: 'text-gray-400' },
];

interface Props {
  conversationId: string;
  status: ConversationStatus;
  onUpdate: (s: ConversationStatus) => void;
}

export function StatusBadge({ conversationId, status, onUpdate }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newStatus: ConversationStatus) => {
      await api.patch(`/conversations/${conversationId}`, { status: newStatus });
    },
    onMutate: (newStatus) => onUpdate(newStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const current = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];

  return (
    <Select.Root value={status} onValueChange={(v) => mutation.mutate(v as ConversationStatus)}>
      <Select.Trigger className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-wm-surface',
        current.color,
      )}>
        <Select.Value />
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 bg-wm-sidebar border border-border rounded-lg shadow-xl overflow-hidden">
          <Select.Viewport className="p-1">
            {STATUS_OPTIONS.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-default hover:bg-wm-surface outline-none data-[highlighted]:bg-wm-surface"
              >
                <Select.ItemIndicator>
                  <Check className="h-3 w-3" />
                </Select.ItemIndicator>
                <Select.ItemText>
                  <span className={opt.color}>{opt.label}</span>
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
