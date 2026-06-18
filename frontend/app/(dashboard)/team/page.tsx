'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, UserCheck, KeyRound, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { api } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type { User, Role } from '@/lib/types';

const COLORS = [
  '#25D366', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#10b981', '#f97316', '#ec4899', '#6366f1',
];

interface MemberFormData {
  name: string;
  email: string;
  password: string;
  role: Role;
  color: string;
}

const EMPTY_FORM: MemberFormData = {
  name: '', email: '', password: '', role: 'MEMBER', color: COLORS[0],
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<MemberFormData>(EMPTY_FORM);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: team, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/team');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormData) => api.post('/team', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast({ title: 'Membro criado com sucesso' });
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast({ title: 'Erro', description: err.response?.data?.error ?? 'Falha ao criar membro', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MemberFormData> }) =>
      api.patch(`/team/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setDialogOpen(false);
      setEditingUser(null);
      toast({ title: 'Membro atualizado' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (isActive) {
        return api.delete(`/team/${id}`);
      } else {
        return api.patch(`/team/${id}`, { isActive: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) =>
      api.post(`/team/${id}/reset-password`, { password }),
    onSuccess: () => {
      setResetPasswordUserId(null);
      setNewPassword('');
      toast({ title: 'Senha redefinida com sucesso' });
    },
  });

  function openCreate() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      color: user.color,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingUser) {
      const data: Partial<MemberFormData> = {
        name: form.name,
        email: form.email,
        role: form.role,
        color: form.color,
      };
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="h-full overflow-y-auto bg-wm-bg">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie os membros da sua equipe</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-wm-green text-white rounded-lg text-sm font-medium hover:bg-wm-green-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo membro
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-wm-green animate-spin" />
          </div>
        ) : (
          <div className="bg-wm-sidebar border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left px-4 py-3 font-medium">Membro</th>
                  <th className="text-left px-4 py-3 font-medium">Papel</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(team ?? []).map((member) => (
                  <tr key={member.id} className="border-b border-border/50 hover:bg-wm-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: member.color }}
                        >
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        member.role === 'ADMIN'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-blue-500/10 text-blue-400',
                      )}>
                        {member.role === 'ADMIN' ? 'Gestor' : 'Membro'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        member.isActive
                          ? 'bg-wm-green/10 text-wm-green'
                          : 'bg-wm-red/10 text-wm-red',
                      )}>
                        {member.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(member)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-wm-surface"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setResetPasswordUserId(member.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-wm-surface"
                          title="Redefinir senha"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: member.id, isActive: member.isActive })}
                          className={cn(
                            'p-1.5 rounded-md transition-colors',
                            member.isActive
                              ? 'text-muted-foreground hover:text-wm-red hover:bg-wm-red/10'
                              : 'text-muted-foreground hover:text-wm-green hover:bg-wm-green/10',
                          )}
                          title={member.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {member.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-wm-sidebar border border-border rounded-xl p-6 z-50 shadow-2xl">
            <Dialog.Title className="text-lg font-semibold mb-5">
              {editingUser ? 'Editar membro' : 'Novo membro'}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nome">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full bg-wm-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wm-green"
                />
              </Field>

              <Field label="E-mail">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full bg-wm-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wm-green"
                />
              </Field>

              {!editingUser && (
                <Field label="Senha">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={8}
                    className="w-full bg-wm-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wm-green"
                  />
                </Field>
              )}

              <Field label="Papel">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full bg-wm-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wm-green"
                >
                  <option value="MEMBER">Membro</option>
                  <option value="ADMIN">Gestor</option>
                </select>
              </Field>

              <Field label="Cor identificadora">
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                        form.color === color ? 'border-white scale-110' : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-wm-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg bg-wm-green text-white text-sm font-medium hover:bg-wm-green-hover disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!resetPasswordUserId} onOpenChange={() => setResetPasswordUserId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-wm-sidebar border border-border rounded-xl p-6 z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">Redefinir senha</Dialog.Title>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha (mín. 8 caracteres)"
              minLength={8}
              className="w-full bg-wm-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wm-green mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setResetPasswordUserId(null)}
                className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-wm-surface"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (resetPasswordUserId && newPassword.length >= 8) {
                    resetPasswordMutation.mutate({ id: resetPasswordUserId, password: newPassword });
                  }
                }}
                disabled={newPassword.length < 8 || resetPasswordMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-wm-green text-white text-sm font-medium disabled:opacity-50"
              >
                Redefinir
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
