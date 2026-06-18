'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Smartphone, WifiOff, Wifi, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import type { Settings, AssignmentMode } from '@/lib/types';

interface ConnectionState {
  state: 'open' | 'connecting' | 'close';
}

interface QRCodeData {
  pairingCode: string | null;
  code: string;
  base64: string;
  count: number;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<Settings>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get<Settings>('/settings');
      return data;
    },
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => api.patch('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Configurações salvas' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 text-wm-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-wm-bg">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure a integração e comportamentos do sistema</p>
        </div>

        <WhatsAppConnectionSection />

        <Section title="Atribuição automática" description="Configure como as conversas são distribuídas para a equipe">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Atribuição automática</p>
                <p className="text-xs text-muted-foreground">Distribui conversas automaticamente ao receber nova mensagem</p>
              </div>
              <button
                onClick={() => setForm({ ...form, autoAssign: !form.autoAssign })}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative',
                  form.autoAssign ? 'bg-wm-green' : 'bg-wm-surface border border-border',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                  form.autoAssign ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </button>
            </div>

            {form.autoAssign && (
              <Field label="Modo de distribuição">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'ROUND_ROBIN', label: 'Round Robin', desc: 'Turnos' },
                    { value: 'LEAST_BUSY', label: 'Menos ocupado', desc: 'Carga' },
                    { value: 'MANUAL', label: 'Manual', desc: 'Gestor' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setForm({ ...form, assignmentMode: mode.value as AssignmentMode })}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-colors',
                        form.assignmentMode === mode.value
                          ? 'border-wm-green bg-wm-green/10'
                          : 'border-border bg-wm-surface hover:border-border/80',
                      )}
                    >
                      <p className="text-sm font-medium">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Permitir membros responder sem atribuição</p>
                <p className="text-xs text-muted-foreground">Membros podem responder conversas não atribuídas a eles</p>
              </div>
              <button
                onClick={() => setForm({ ...form, allowMembersOverride: !form.allowMembersOverride })}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative',
                  form.allowMembersOverride ? 'bg-wm-green' : 'bg-wm-surface border border-border',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                  form.allowMembersOverride ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </button>
            </div>
          </div>
        </Section>

        <Section title="Alertas de SLA" description="Configure os limites de tempo sem resposta">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Alerta (minutos)">
              <input
                type="number"
                min={1}
                max={1440}
                value={form.slaWarningMinutes ?? 30}
                onChange={(e) => setForm({ ...form, slaWarningMinutes: Number(e.target.value) })}
                className="w-full bg-wm-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wm-green"
              />
              <p className="text-xs text-muted-foreground mt-1">Destaca a conversa em amarelo</p>
            </Field>

            <Field label="Crítico (minutos)">
              <input
                type="number"
                min={1}
                max={1440}
                value={form.slaCriticalMinutes ?? 60}
                onChange={(e) => setForm({ ...form, slaCriticalMinutes: Number(e.target.value) })}
                className="w-full bg-wm-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-wm-green"
              />
              <p className="text-xs text-muted-foreground mt-1">Destaca a conversa em vermelho</p>
            </Field>
          </div>
        </Section>

        <div className="flex justify-end">
          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-wm-green text-white rounded-lg text-sm font-medium hover:bg-wm-green-hover disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar configurações
          </button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppConnectionSection() {
  const queryClient = useQueryClient();

  const { data: state, isLoading: loadingState } = useQuery({
    queryKey: ['connection-state'],
    queryFn: async () => {
      const { data } = await api.get<ConnectionState>('/settings/connection-state');
      return data;
    },
    refetchInterval: 5000,
  });

  const {
    data: qrData,
    isFetching: loadingQR,
    refetch: refetchQR,
  } = useQuery({
    queryKey: ['qrcode'],
    queryFn: async () => {
      const { data } = await api.get<QRCodeData>('/settings/qrcode');
      return data;
    },
    enabled: state?.state !== 'open',
    refetchInterval: state?.state === 'connecting' ? 10000 : false,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => api.post('/settings/logout'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-state'] });
      queryClient.invalidateQueries({ queryKey: ['qrcode'] });
      toast({ title: 'WhatsApp desconectado' });
    },
  });

  const isConnected = state?.state === 'open';
  const isConnecting = state?.state === 'connecting';

  return (
    <Section title="Conexão WhatsApp" description="Escaneie o QR Code para conectar seu número ao sistema">
      <div className="space-y-4">
        <div className={cn(
          'flex items-center gap-3 p-4 rounded-xl border',
          isConnected
            ? 'bg-wm-green/10 border-wm-green/30'
            : isConnecting
            ? 'bg-wm-yellow/10 border-wm-yellow/30'
            : 'bg-wm-red/10 border-wm-red/30',
        )}>
          {loadingState ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isConnected ? (
            <Wifi className="h-5 w-5 text-wm-green" />
          ) : isConnecting ? (
            <Loader2 className="h-5 w-5 animate-spin text-wm-yellow" />
          ) : (
            <WifiOff className="h-5 w-5 text-wm-red" />
          )}
          <div className="flex-1">
            <p className={cn(
              'text-sm font-semibold',
              isConnected ? 'text-wm-green' : isConnecting ? 'text-wm-yellow' : 'text-wm-red',
            )}>
              {isConnected ? 'WhatsApp Conectado' : isConnecting ? 'Conectando...' : 'WhatsApp Desconectado'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isConnected
                ? 'Recebendo e enviando mensagens normalmente'
                : isConnecting
                ? 'Aguardando escaneamento do QR Code'
                : 'Escaneie o QR Code para conectar'}
            </p>
          </div>
          {isConnected && (
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wm-red/10 text-wm-red text-xs font-medium hover:bg-wm-red/20 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Desconectar
            </button>
          )}
        </div>

        {!isConnected && (
          <div className="flex flex-col items-center gap-4">
            {loadingQR ? (
              <div className="w-56 h-56 bg-wm-surface rounded-xl flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-xs">Gerando QR Code...</p>
                </div>
              </div>
            ) : qrData?.base64 ? (
              <div className="bg-white p-3 rounded-xl shadow-lg">
                <img
                  src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`}
                  alt="QR Code WhatsApp"
                  className="w-52 h-52 object-contain"
                />
              </div>
            ) : (
              <div className="w-56 h-56 bg-wm-surface rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                <div className="text-center text-muted-foreground px-4">
                  <Smartphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">QR Code indisponível</p>
                  <p className="text-xs mt-1">
                    Verifique as configurações da API e clique em Gerar QR Code
                  </p>
                </div>
              </div>
            )}

            {qrData?.pairingCode && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Ou use o código de pareamento:</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-foreground bg-wm-surface px-4 py-2 rounded-lg border border-border">
                  {qrData.pairingCode}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => refetchQR()}
                disabled={loadingQR}
                className="inline-flex items-center gap-2 px-4 py-2 bg-wm-green text-white rounded-lg text-sm font-medium hover:bg-wm-green-hover disabled:opacity-50 transition-colors"
              >
                {loadingQR ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {qrData ? 'Atualizar QR Code' : 'Gerar QR Code'}
              </button>
            </div>

            <div className="bg-wm-surface/50 rounded-lg p-3 text-xs text-muted-foreground w-full max-w-sm text-center space-y-1">
              <p className="font-medium text-foreground">Como escanear</p>
              <p>Abra o WhatsApp no celular → Dispositivos conectados → Conectar um dispositivo</p>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

function Section({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-wm-sidebar border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="p-6">{children}</div>
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
