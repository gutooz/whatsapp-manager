import Link from 'next/link';
import {
  MessageSquare,
  Users,
  Zap,
  BarChart3,
  Shield,
  CheckCircle,
  ArrowRight,
  MessageCircle,
  UserCheck,
  Clock,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0f1117]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#25D366]/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#25D366]" />
            </div>
            <span className="font-bold text-lg">WhatsApp Manager</span>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg border border-[#25D366] text-[#25D366] text-sm font-medium hover:bg-[#25D366] hover:text-black transition-all duration-200"
          >
            Acessar sistema
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Glow bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#25D366]/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-28 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
            Powered by WhatsApp Business
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            Atenda clientes no{' '}
            <span className="text-[#25D366]">WhatsApp</span>
            <br />
            com toda a sua equipe
          </h1>

          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Uma central de atendimento completa para o WhatsApp. Gerencie conversas, distribua para
            agentes e monitore tudo em tempo real — sem complicação.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#25D366] hover:bg-[#1fad53] text-black font-bold rounded-xl transition-all duration-200 text-base shadow-lg shadow-[#25D366]/20"
            >
              Começar agora
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all duration-200"
            >
              Ver como funciona
            </a>
          </div>

          {/* Mock UI */}
          <div className="mt-20 rounded-2xl border border-white/10 bg-[#1a1d27] overflow-hidden shadow-2xl shadow-black/60 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#252836]">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-[#25D366]/70" />
              <span className="text-xs text-white/30 ml-2">WhatsApp Manager — Central de atendimento</span>
            </div>
            <div className="flex h-56 md:h-72">
              {/* Sidebar mock */}
              <div className="w-56 border-r border-white/5 p-3 space-y-2 hidden md:block">
                {['João Silva', 'Maria Souza', 'Carlos Lima', 'Ana Pereira', 'Pedro Costa'].map(
                  (name, i) => (
                    <div
                      key={name}
                      className={`flex items-center gap-2 p-2 rounded-lg ${i === 0 ? 'bg-[#252836]' : ''}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{
                          backgroundColor: ['#25D366', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][i],
                        }}
                      >
                        {name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{name}</div>
                        <div className="text-[10px] text-white/30 truncate">Última mensagem...</div>
                      </div>
                      {i === 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#25D366] text-[9px] font-bold flex items-center justify-center text-black">
                          3
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>
              {/* Chat mock */}
              <div className="flex-1 flex flex-col p-4 gap-3">
                <div className="flex justify-start">
                  <div className="bg-[#252836] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-xs">
                    Olá, gostaria de saber mais sobre os planos 👋
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#25D366]/20 border border-[#25D366]/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-xs">
                    Olá João! Claro, posso te ajudar. Qual plano te interessa?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#252836] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-xs">
                    O mensal, por favor. Tem suporte incluso?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-[#1a1d27]/50">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '∞', label: 'Conversas simultâneas' },
            { value: 'N agentes', label: 'Na mesma conta' },
            { value: '100%', label: 'Tempo real' },
            { value: '24/7', label: 'Disponibilidade' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-[#25D366] mb-1">{s.value}</div>
              <div className="text-sm text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Tudo que sua equipe precisa
          </h2>
          <p className="text-white/40 text-lg">
            Recursos completos para gerenciar o atendimento via WhatsApp
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: 'Multi-agentes',
              desc: 'Vários atendentes usando o mesmo número de WhatsApp ao mesmo tempo, sem conflitos.',
              color: '#25D366',
            },
            {
              icon: Zap,
              title: 'Atribuição inteligente',
              desc: 'Distribua conversas entre os agentes da equipe e acompanhe quem está atendendo cada cliente.',
              color: '#3b82f6',
            },
            {
              icon: MessageCircle,
              title: 'Tempo real',
              desc: 'Mensagens chegam instantaneamente para toda a equipe via WebSocket. Sem precisar recarregar.',
              color: '#8b5cf6',
            },
            {
              icon: BarChart3,
              title: 'Dashboard completo',
              desc: 'Métricas de atendimento, tempo de resposta e desempenho da equipe em um só lugar.',
              color: '#f59e0b',
            },
            {
              icon: Shield,
              title: 'Controle de acesso',
              desc: 'Defina permissões por usuário. Admins e agentes com visões e ações diferentes.',
              color: '#ef4444',
            },
            {
              icon: Clock,
              title: 'Histórico completo',
              desc: 'Todo o histórico de conversas salvo e pesquisável. Nunca perca o contexto de um cliente.',
              color: '#14b8a6',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-[#1a1d27] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-200 group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${f.color}15` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-[#1a1d27]/40 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Como funciona</h2>
            <p className="text-white/40 text-lg">Configure em minutos e comece a atender</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: MessageSquare,
                title: 'Conecte o WhatsApp',
                desc: 'Escaneie o QR Code com seu celular para vincular o número de WhatsApp ao sistema.',
              },
              {
                step: '02',
                icon: UserCheck,
                title: 'Convide a equipe',
                desc: 'Cadastre seus agentes e defina as permissões de cada um. Sem limite de usuários.',
              },
              {
                step: '03',
                icon: Zap,
                title: 'Comece a atender',
                desc: 'As mensagens chegam em tempo real. Distribua, responda e acompanhe tudo no painel.',
              },
            ].map((step, i) => (
              <div key={step.step} className="relative text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px border-t border-dashed border-white/10" />
                )}
                <div className="w-20 h-20 rounded-2xl bg-[#252836] border border-white/10 flex items-center justify-center mx-auto mb-5 relative">
                  <step.icon className="w-8 h-8 text-[#25D366]" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#25D366] text-black text-[10px] font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6">
              Por que usar o{' '}
              <span className="text-[#25D366]">WhatsApp Manager?</span>
            </h2>
            <div className="space-y-4">
              {[
                'Sem limite de agentes atendendo ao mesmo tempo',
                'Nenhuma mensagem perdida — histórico completo salvo',
                'Atribuição de conversas evita conflitos na equipe',
                'Notificações em tempo real para toda a equipe',
                'Interface rápida e intuitiva para os agentes',
                'Controle total sobre as conversas e o desempenho',
              ].map((b) => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#25D366] flex-shrink-0 mt-0.5" />
                  <span className="text-white/70">{b}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#1a1d27] border border-white/5 rounded-2xl p-8">
            <div className="text-sm text-white/40 mb-2 font-medium uppercase tracking-wider">
              Em vez de
            </div>
            <div className="space-y-3 mb-8">
              {[
                'Um celular passando de mão em mão',
                'Sem saber quem respondeu o quê',
                'Clientes sem resposta por dias',
                'Impossível escalar o atendimento',
              ].map((p) => (
                <div key={p} className="flex items-center gap-3 text-white/30 line-through text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 flex-shrink-0" />
                  {p}
                </div>
              ))}
            </div>
            <div className="text-sm text-[#25D366] mb-2 font-medium uppercase tracking-wider">
              Com o WhatsApp Manager
            </div>
            <div className="space-y-3">
              {[
                'Toda equipe no mesmo painel',
                'Cada conversa atribuída a um agente',
                'Resposta rápida e organizada',
                'Escale sem trocar de ferramenta',
              ].map((p) => (
                <div key={p} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#25D366] flex-shrink-0" />
                  <span className="text-white/80">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#25D366]/5 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-6 py-24 text-center relative">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Pronto para organizar seu atendimento?
          </h2>
          <p className="text-white/40 text-lg mb-10">
            Acesse o sistema agora e conecte seu WhatsApp em minutos.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-10 py-4 bg-[#25D366] hover:bg-[#1fad53] text-black font-bold rounded-xl transition-all duration-200 text-base shadow-lg shadow-[#25D366]/20"
          >
            Acessar o sistema
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#1a1d27]/30">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#25D366]" />
            <span className="font-semibold text-white/60">WhatsApp Manager</span>
          </div>
          <span>Central de atendimento WhatsApp para equipes</span>
        </div>
      </footer>
    </div>
  );
}
