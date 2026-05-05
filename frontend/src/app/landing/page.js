'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    const interval = setInterval(() => setActiveStep(prev => (prev + 1) % 3), 3000);
    return () => { window.removeEventListener('scroll', handleScroll); clearInterval(interval); };
  }, []);

  const steps = [
    { icon: '📋', title: 'Registre a visita', desc: 'Foto antes, pH, produtos usados e valor cobrado — tudo em menos de 2 minutos.' },
    { icon: '📸', title: 'Tire a foto depois', desc: 'Registre o resultado do trabalho com a câmera do celular.' },
    { icon: '📲', title: 'WhatsApp automático', desc: 'O cliente recebe o relatório completo com fotos direto no WhatsApp dele. Você não faz nada.' },
  ];

  const features = [
    { icon: '🤖', title: 'Bot de WhatsApp', desc: 'Após cada visita, o cliente recebe automaticamente as fotos antes/depois + resumo do serviço no WhatsApp da sua empresa.' },
    { icon: '📊', title: 'Controle de Estoque', desc: 'Cada produto usado na visita já baixa automaticamente do seu estoque. Nunca mais perder conta do cloro.' },
    { icon: '🗓️', title: 'Chamados e Agendamentos', desc: 'Crie ordens de serviço, agende visitas e acompanhe o status de cada chamado em tempo real.' },
    { icon: '👷', title: 'Gestão de Equipe', desc: 'Cadastre funcionários com acesso limitado. Cada piscineiro vê apenas o que precisa para trabalhar.' },
    { icon: '📍', title: 'Histórico por Cliente', desc: 'pH, produtos, fotos e observações registradas em cada visita. Histórico completo de cada piscina.' },
    { icon: '💰', title: 'Relatório de Faturamento', desc: 'Veja quanto você faturou no mês, quais clientes geraram mais receita e quais visitas ainda não foram pagas.' },
  ];

  const testimonials = [
    { name: 'Carlos Eduardo', city: 'São Paulo, SP', text: 'Antes eu mandava a mensagem para o cliente na mão depois de cada visita. Agora chego em casa e já foi tudo automático. Profissional demais.', stars: 5 },
    { name: 'Rafael Mendes', city: 'Campinas, SP', text: 'Meu cliente me ligou falando que achou incrível receber as fotos da piscina pelo WhatsApp depois da limpeza. Diferencial total.', stars: 5 },
    { name: 'Diego Alves', city: 'Curitiba, PR', text: 'Gestão de estoque era um caos na planilha. Agora o sistema baixa sozinho. Economizei horas por semana.', stars: 5 },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', color: '#0f172a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        
        .hero-gradient { background: linear-gradient(135deg, #0a1f3a 0%, #0e3d5c 50%, #0a6b7a 100%); }
        .btn-primary { background: linear-gradient(135deg, #00b894, #00cec9); color: white; border: none; cursor: pointer; transition: all 0.3s ease; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0, 184, 148, 0.4); }
        .btn-secondary { background: transparent; color: white; border: 2px solid rgba(255,255,255,0.4); cursor: pointer; transition: all 0.3s ease; }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: white; }
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .whatsapp-bubble { background: #25D366; }
        .fade-in { animation: fadeIn 0.6s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .pulse-dot { animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .gradient-text { background: linear-gradient(135deg, #00b894, #00cec9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .section-badge { background: linear-gradient(135deg, rgba(0,184,148,0.15), rgba(0,206,201,0.15)); border: 1px solid rgba(0,184,148,0.3); }
        .nav-link { color: rgba(255,255,255,0.75); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; cursor: pointer; }
        .nav-link:hover { color: white; }
        .step-active { background: linear-gradient(135deg, #00b894, #00cec9); color: white; box-shadow: 0 8px 20px rgba(0,184,148,0.35); }
        .step-inactive { background: white; color: #64748b; border: 2px solid #e2e8f0; }
        .price-card-popular { background: linear-gradient(135deg, #0e3d5c, #0a6b7a); color: white; }
        .price-card-popular .price-feature { color: rgba(255,255,255,0.8); }
        .checkmark { color: #00b894; font-size: 16px; }
        .checkmark-white { color: #6ee7b7; font-size: 16px; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(10, 31, 58, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="Pool Light Logo" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a className="nav-link" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>Como funciona</a>
          <a className="nav-link" onClick={() => document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' })}>Funcionalidades</a>
          <a className="nav-link" onClick={() => document.getElementById('precos')?.scrollIntoView({ behavior: 'smooth' })}>Preços</a>
          <button className="btn-primary" onClick={() => router.push('/login')} style={{
            padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
          }}>Entrar →</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-gradient" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '100px 24px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="section-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, marginBottom: 28 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00b894', display: 'inline-block' }}></span>
            <span style={{ color: '#00b894', fontSize: 13, fontWeight: 600 }}>Novo: Envio automático de fotos pelo WhatsApp</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, color: 'white', lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 24 }}>
            Gerencie suas piscinas.<br />
            <span className="gradient-text">Impressione seus clientes.</span>
          </h1>

          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 40, maxWidth: 580, margin: '0 auto 40px' }}>
            O único app de gestão de piscinas do Brasil que envia automaticamente o relatório da visita — com fotos — direto no WhatsApp do seu cliente.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => router.push('/login')} style={{
              padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px'
            }}>
              Começar gratuitamente →
            </button>
            <button className="btn-secondary" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })} style={{
              padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 600
            }}>
              Ver como funciona
            </button>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 20 }}>Sem cartão de crédito • Configuração em 5 minutos</p>

          {/* HERO VISUAL — WhatsApp Mock */}
          <div style={{ marginTop: 64, position: 'relative', display: 'inline-block', width: '100%', maxWidth: 480 }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 24, padding: 24, backdropFilter: 'blur(10px)',
              textAlign: 'left'
            }}>
              {/* Phone header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💧</div>
                <div>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Pool Light Bot</p>
                  <p style={{ color: '#25D366', fontSize: 12 }}>✓ Enviado automaticamente</p>
                </div>
              </div>

              {/* Message bubbles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: '#25D366', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', maxWidth: '85%' }}>
                  <p style={{ color: 'white', fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>
                    Olá <strong>Carlos</strong>! ✅ A manutenção da sua piscina foi finalizada.
                  </p>
                </div>
                <div style={{ background: '#25D366', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', maxWidth: '85%' }}>
                  <p style={{ color: 'white', fontSize: 13, lineHeight: 1.6 }}>
                    <strong>📊 Status da Água:</strong><br/>
                    - pH Inicial: 6.2<br/>
                    - pH Final: 7.4 ✅<br/><br/>
                    <strong>💰 Serviço:</strong> R$ 120,00<br/><br/>
                    <strong>🧴 Produtos utilizados:</strong><br/>
                    - 2kg de Cloro<br/>
                    - 500ml de Algicida
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 8, width: 100, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏊</div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 8, width: 100, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✨</div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'right' }}>Enviado automaticamente • agora ✓✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGOS / SOCIAL PROOF BAR */}
      <div style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
          Já utilizado por piscineiros em SP • RJ • MG • PR • RS
        </p>
      </div>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div className="section-badge" style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }}>
            <span style={{ color: '#00b894', fontSize: 13, fontWeight: 600 }}>Simples assim</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16 }}>
            3 passos. Visita registrada.<br />Cliente avisado.
          </h2>
          <p style={{ color: '#64748b', fontSize: 17, marginBottom: 64 }}>Todo o trabalho chato fica com o app. Você foca no que realmente importa: a piscina.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {steps.map((step, i) => (
              <div key={i} className="card-hover" onClick={() => setActiveStep(i)} style={{
                padding: 32, borderRadius: 20, cursor: 'pointer',
                ...(activeStep === i
                  ? { background: 'linear-gradient(135deg, #0e3d5c, #0a6b7a)', color: 'white', boxShadow: '0 20px 40px rgba(14,61,92,0.3)' }
                  : { background: '#f8fafc', border: '2px solid #e2e8f0', color: '#0f172a' })
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{step.icon}</div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', fontSize: 13, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  background: activeStep === i ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color: activeStep === i ? 'white' : '#64748b'
                }}>
                  {i + 1}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: activeStep === i ? 'rgba(255,255,255,0.8)' : '#64748b' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funcionalidades" style={{ padding: '100px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-badge" style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }}>
              <span style={{ color: '#00b894', fontSize: 13, fontWeight: 600 }}>Tudo que você precisa</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16 }}>
              Funcionalidades que fazem a diferença
            </h2>
            <p style={{ color: '#64748b', fontSize: 17 }}>Feito especificamente para piscineiros. Não para qualquer prestador de serviço.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} className="card-hover" style={{
                background: 'white', borderRadius: 20, padding: 28,
                border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAL — WhatsApp */}
      <section style={{ padding: '100px 24px', background: 'linear-gradient(135deg, #0a1f3a 0%, #0a6b7a 100%)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 60, alignItems: 'center' }}>
          <div>
            <div className="section-badge" style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: 100, marginBottom: 20 }}>
              <span style={{ color: '#00b894', fontSize: 13, fontWeight: 600 }}>Nosso maior diferencial</span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'white', letterSpacing: '-1.5px', lineHeight: 1.2, marginBottom: 20 }}>
              Nenhum outro app faz isso no Brasil
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, lineHeight: 1.7, marginBottom: 32 }}>
              O cliente recebe um relatório profissional com fotos antes e depois da limpeza, nível de pH corrigido, produtos utilizados e valor cobrado — tudo automaticamente no WhatsApp da sua empresa.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Sem custo de SMS ou ligação', 'Aparece no WhatsApp da sua empresa', 'O cliente já fica esperando o relatório', 'Aumenta a confiança e fidelidade'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#00b894', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', fontWeight: 700, flexShrink: 0 }}>✓</div>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: '#ECE5DD', borderRadius: 24, padding: 24, width: '100%', maxWidth: 320,
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)'
            }}>
              <div style={{ background: '#075E54', borderRadius: '16px 16px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, margin: '-24px -24px 16px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💧</div>
                <div>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Pool Light Bot</p>
                  <p style={{ color: '#8bcea8', fontSize: 11 }}>online agora</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: '#25D366', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                  <p style={{ color: 'white', fontSize: 12, lineHeight: 1.55, fontWeight: 500 }}>
                    Olá <strong>Ricardo</strong>! ✅ Manutenção finalizada!<br/><br/>
                    💧 pH: 6.2 → <strong>7.4 ✅</strong><br/>
                    💰 Valor: <strong>R$ 150,00</strong><br/>
                    🧴 Cloro 2kg + Algicida 500ml
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, height: 80, background: '#d1d5db', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏊</div>
                  <div style={{ flex: 1, height: 80, background: '#d1d5db', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✨</div>
                </div>
                <p style={{ color: '#a3a3a3', fontSize: 10, textAlign: 'right' }}>14:23 ✓✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <div className="section-badge" style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }}>
            <span style={{ color: '#00b894', fontSize: 13, fontWeight: 600 }}>Quem já usa</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 56 }}>
            Piscineiros que economizam horas por semana
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} className="card-hover" style={{
                background: '#f8fafc', borderRadius: 20, padding: 28, textAlign: 'left',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ color: '#fbbf24', fontSize: 18, marginBottom: 16 }}>{'⭐'.repeat(t.stars)}</div>
                <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{t.name}</p>
                  <p style={{ color: '#94a3b8', fontSize: 13 }}>{t.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="precos" style={{ padding: '100px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div className="section-badge" style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: 100, marginBottom: 16 }}>
            <span style={{ color: '#00b894', fontSize: 13, fontWeight: 600 }}>Planos e valores</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16 }}>
            Simples e justo
          </h2>
          <p style={{ color: '#64748b', fontSize: 17, marginBottom: 56 }}>Cancele quando quiser. Sem fidelidade.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* Free */}
            <div style={{ background: 'white', borderRadius: 24, padding: 32, border: '2px solid #e2e8f0', textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Gratuito</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px' }}>R$0</span>
                <span style={{ color: '#94a3b8' }}>/mês</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>Para testar sem compromisso</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {['Até 5 clientes', 'Registro de visitas', 'Controle de estoque', 'Chamados básicos'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="checkmark">✓</span>
                    <span style={{ color: '#374151', fontSize: 15 }}>{item}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#cbd5e1', fontSize: 16 }}>✗</span>
                  <span style={{ color: '#94a3b8', fontSize: 15, textDecoration: 'line-through' }}>WhatsApp automático</span>
                </div>
              </div>
              <button onClick={() => router.push('/login')} style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: '2px solid #e2e8f0',
                background: 'white', fontSize: 15, fontWeight: 700, color: '#374151', cursor: 'pointer',
                transition: 'all 0.2s'
              }} onMouseEnter={e => e.target.style.background = '#f8fafc'} onMouseLeave={e => e.target.style.background = 'white'}>
                Começar grátis
              </button>
            </div>

            {/* Pro */}
            <div style={{ background: 'linear-gradient(135deg, #0e3d5c, #0a6b7a)', borderRadius: 24, padding: 32, textAlign: 'left', position: 'relative', boxShadow: '0 20px 50px rgba(14,61,92,0.4)' }}>
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #00b894, #00cec9)', color: 'white',
                padding: '4px 16px', borderRadius: 100, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
              }}>
                ⚡ MAIS POPULAR
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Pro</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-2px', color: 'white' }}>R$89</span>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>/mês</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 28 }}>Para piscineiros que querem crescer</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {[
                  'Clientes ilimitados',
                  'Registro de visitas + fotos',
                  'Controle de estoque',
                  'Chamados e agendamentos',
                  '🤖 WhatsApp automático',
                  'Gestão de equipe (até 3)',
                  'Histórico completo por cliente',
                  'Suporte prioritário'
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="checkmark-white">✓</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15 }}>{item}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={() => router.push('/login')} style={{
                width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 700,
              }}>
                Assinar agora →
              </button>
            </div>
          </div>

          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 24 }}>
            💳 Pagamento via Pix ou cartão de crédito • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: '100px 24px', background: 'linear-gradient(135deg, #0a1f3a, #0a6b7a)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <img src="/logo.png" alt="Pool Light" style={{ height: 72, width: 'auto', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'white', letterSpacing: '-1.5px', marginBottom: 20 }}>
            Pronto para impressionar seus clientes?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, marginBottom: 40, lineHeight: 1.7 }}>
            Comece agora. Configure em 5 minutos. Seus clientes vão perguntar o que você fez diferente.
          </p>
          <button className="btn-primary" onClick={() => router.push('/login')} style={{
            padding: '18px 48px', borderRadius: 16, fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px'
          }}>
            Criar conta gratuita →
          </button>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 16 }}>Sem cartão de crédito. Sem burocracia.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0a1020', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <img src="/logo.png" alt="Pool Light" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
        </div>
        <p style={{ color: '#475569', fontSize: 13 }}>
          © {new Date().getFullYear()} Pool Light. Feito para piscineiros brasileiros. 🇧🇷
        </p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 16 }}>
          <a onClick={() => router.push('/login')} style={{ color: '#64748b', fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}>Entrar</a>
          <span style={{ color: '#1e293b' }}>•</span>
          <a style={{ color: '#64748b', fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}>contato@poollight.com.br</a>
        </div>
      </footer>
    </div>
  );
}
