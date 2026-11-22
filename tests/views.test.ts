// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { criarCtx } from './helpers/ctx';
import { renderHoje } from '../src/views/hoje';
import { renderCardapio } from '../src/views/cardapio';
import { renderCompras } from '../src/views/compras';
import { renderCheckin } from '../src/views/checkin';
import { renderAulas } from '../src/views/aulas';
import { montar } from '../src/app';

const el = () => document.createElement('div');
const espera = () => new Promise((r) => setTimeout(r, 0));
const clicar = async (n: Element | null) => { (n as HTMLElement).click(); await espera(); };
const marcar = async (raiz: HTMLElement, nome: string) => {
  const box = raiz.querySelector(`input[name=${nome}]`) as HTMLInputElement;
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
  await espera();
};
const completo = (dia: string) => ({ dia, alimentacao: true, agua: true, movimento: true, sono: true, deus: true });

describe('Hoje', () => {
  it('mostra a próxima refeição e um versículo ou oração antes dela', () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 } });
    const e = el();
    renderHoje(e, ctx);
    expect(e.textContent).toContain('Lanche da tarde');
    expect(e.textContent).toContain('16:00');
    expect(e.querySelector('[data-testid=texto-refeicao]')?.textContent?.length).toBeGreaterThan(10);
    expect(e.querySelector('a[href="#/checkin"]')).not.toBeNull();
  });
  it('sem cardápio escolhido → convida a escolher', () => {
    const { ctx } = criarCtx();
    const e = el();
    renderHoje(e, ctx);
    expect(e.querySelector('a[href="#/cardapio"]')).not.toBeNull();
  });
  it('mostra a sequência de dias', () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 }, checkins: [completo('2026-11-20'), completo('2026-11-21')] });
    const e = el();
    renderHoje(e, ctx);
    expect(e.querySelector('[data-testid=sequencia]')?.textContent).toContain('2');
  });
  it('ontem incompleto → palavra de força; ontem completo → nenhuma', () => {
    const a = criarCtx({ prefs: { kcal: 1100 }, checkins: [{ ...completo('2026-11-20'), sono: false }] });
    const ea = el(); renderHoje(ea, a.ctx);
    expect(ea.querySelector('[data-testid=incentivo]')).not.toBeNull();
    const b = criarCtx({ prefs: { kcal: 1100 }, checkins: [completo('2026-11-20')] });
    const eb = el(); renderHoje(eb, b.ctx);
    expect(eb.querySelector('[data-testid=incentivo]')).toBeNull();
  });
});

describe('Cardápio', () => {
  it('sem faixa → lista as opções; escolher grava e mostra as refeições com substituições', async () => {
    const { ctx, getPrefs } = criarCtx();
    const e = el();
    renderCardapio(e, ctx);
    await clicar(e.querySelector('button[data-kcal="1100"]'));
    expect(getPrefs().kcal).toBe(1100);
    expect(e.textContent).toContain('Café da manhã');
    expect(e.textContent).toContain('pode substituir por'.toLowerCase());
  });
});

describe('Compras', () => {
  it('lista agrupada do cardápio escolhido, sem gramas', () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 } });
    const e = el();
    renderCompras(e, ctx);
    expect(e.textContent).toContain('Frango, peito');
    expect(e.textContent).not.toMatch(/\d+\s?g\b/);
  });
  it('trocar o item pela substituição atualiza a lista', async () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 } });
    const e = el();
    renderCompras(e, ctx);
    for (const k of ['almoco:Frango, peito', 'jantar:Frango, peito']) {
      const sel = e.querySelector(`select[data-item="${k}"]`) as HTMLSelectElement;
      sel.value = 'Peixe';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      await espera();
    }
    expect(e.textContent).toContain('Peixe');
    expect(e.querySelector('li[data-nome="Frango, peito"]')).toBeNull();
  });
  it('a troca de uma refeição não mexe nas outras (o jantar continua com frango)', async () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 } });
    const e = el();
    renderCompras(e, ctx);
    const sel = e.querySelector('select[data-item="almoco:Frango, peito"]') as HTMLSelectElement;
    sel.value = 'Peixe';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await espera();
    expect(e.querySelector('li[data-nome="Peixe"]')).not.toBeNull();
    expect(e.querySelector('li[data-nome="Frango, peito"]')).not.toBeNull();
  });
  it('sem cardápio → convida a escolher', () => {
    const e = el();
    renderCompras(e, criarCtx().ctx);
    expect(e.querySelector('a[href="#/cardapio"]')).not.toBeNull();
  });
});

describe('Check-in', () => {
  it('mostra exatamente os 5 itens da especificação', () => {
    const e = el();
    renderCheckin(e, criarCtx().ctx);
    const nomes = [...e.querySelectorAll('label')].map((l) => l.textContent?.trim());
    expect(nomes).toEqual(['Alimentação', 'Água', 'Movimento', 'Sono', 'Momento com Deus']);
  });
  it('marcar salva o dia de São Paulo', async () => {
    const { ctx, salvos } = criarCtx();
    const e = el();
    renderCheckin(e, ctx);
    await marcar(e, 'agua');
    expect(salvos.at(-1)).toMatchObject({ dia: '2026-11-21', agua: true, alimentacao: false });
  });
  it('concluir com itens faltando → palavra de força', async () => {
    const e = el();
    renderCheckin(e, criarCtx().ctx);
    await marcar(e, 'agua');
    await clicar(e.querySelector('button[data-acao=concluir]'));
    expect(e.querySelector('[data-testid=mensagem]')?.getAttribute('data-tipo')).toBe('incentivo');
  });
  it('concluir com tudo marcado → gratidão', async () => {
    const e = el();
    renderCheckin(e, criarCtx().ctx);
    for (const n of ['alimentacao', 'agua', 'movimento', 'sono', 'deus']) await marcar(e, n);
    await clicar(e.querySelector('button[data-acao=concluir]'));
    expect(e.querySelector('[data-testid=mensagem]')?.getAttribute('data-tipo')).toBe('gratidao');
  });
  it('salvamento sem internet avisa que vai sincronizar', async () => {
    const { ctx } = criarCtx();
    ctx.checkins.salvar = async () => 'pendente';
    const e = el();
    renderCheckin(e, ctx);
    await marcar(e, 'agua');
    expect(e.textContent).toContain('sincroniz');
  });
});

describe('Check-in com acesso bloqueado', () => {
  it('avisa que o acesso não está ativo, em vez de dizer que vai sincronizar', async () => {
    const { ctx } = criarCtx();
    ctx.checkins.salvar = async () => 'recusado';
    const e = el();
    renderCheckin(e, ctx);
    await marcar(e, 'agua');
    expect(e.textContent).toContain('acesso não está ativo');
    expect(e.textContent).not.toContain('sincroniz');
  });
});

describe('Aulas e app', () => {
  it('Aulas leva à área do aluno na Eduzz', () => {
    const e = el();
    renderAulas(e, criarCtx().ctx);
    expect((e.querySelector('a.botao') as HTMLAnchorElement).href).toContain('exemplo.test/aulas');
  });
  it('sem sessão mostra o login; com sessão mostra a tela Hoje', async () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 } });
    const login = { pedirCodigo: async () => ({ ok: true as const }), confirmarCodigo: async () => true };
    const a = el();
    await montar(a, { ctx, acesso: async () => 'sem-sessao', login });
    expect(a.textContent).toContain('e-mail da compra');
    const b = el();
    await montar(b, { ctx, acesso: async () => 'ativo', login });
    expect(b.textContent).toContain('Lanche da tarde');
    expect(b.querySelector('nav.inferior')).not.toBeNull();
  });
  it('acesso bloqueado mostra aviso, sem cardápios nem menu, e permite entrar com outro e-mail', async () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 } });
    const login = { pedirCodigo: async () => ({ ok: true as const }), confirmarCodigo: async () => true };
    const a = el();
    await montar(a, { ctx, acesso: async () => 'bloqueado', login });
    expect(a.textContent).toContain('acesso não está ativo');
    expect(a.textContent).not.toContain('Lanche da tarde');
    expect(a.querySelector('nav.inferior')).toBeNull();
  });
  it('o menu tem o botão Sair', async () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 } });
    const login = { pedirCodigo: async () => ({ ok: true as const }), confirmarCodigo: async () => true };
    let saiu = false;
    const a = el();
    await montar(a, { ctx, acesso: async () => 'ativo', login, sair: async () => void (saiu = true) });
    (a.querySelector('[data-acao=sair]') as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(saiu).toBe(true);
  });
});
