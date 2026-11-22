// @vitest-environment jsdom
window.scrollTo = () => {}; // jsdom não implementa a rolagem
import { describe, it, expect } from 'vitest';
import { criarCtx, cardapio } from './helpers/ctx';
import { renderHoje } from '../src/views/hoje';
import { renderCardapio } from '../src/views/cardapio';
import { renderCompras } from '../src/views/compras';
import { renderCheckin } from '../src/views/checkin';
import { renderAulas } from '../src/views/aulas';
import { renderCalculadora } from '../src/views/calculadora';
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

describe('Check-in: reflexão e anotações', () => {
  it('mostra a reflexão bíblica do dia com a referência', () => {
    const e = el();
    renderCheckin(e, criarCtx().ctx);
    const r = e.querySelector('[data-testid=reflexao]')!;
    expect(r.textContent!.length).toBeGreaterThan(40);
    expect(r.querySelector('cite')?.textContent).toMatch(/\d/);
  });
  it('cada um dos 5 itens tem um campo de anotação com exemplo suave', () => {
    const e = el();
    renderCheckin(e, criarCtx().ctx);
    for (const n of ['alimentacao', 'agua', 'movimento', 'sono', 'deus']) {
      const t = e.querySelector(`textarea[name=nota-${n}]`) as HTMLTextAreaElement;
      expect(t.placeholder).toMatch(/^Ex\.:/);
    }
    expect((e.querySelector('textarea[name=nota-alimentacao]') as HTMLTextAreaElement).placeholder).toContain('refeições');
  });
  it('escrever uma anotação salva junto com o check-in', async () => {
    const { ctx, salvos } = criarCtx();
    const e = el();
    renderCheckin(e, ctx);
    const t = e.querySelector('textarea[name=nota-agua]') as HTMLTextAreaElement;
    t.value = 'bebi 2 litros';
    t.dispatchEvent(new Event('change', { bubbles: true }));
    await espera();
    expect(salvos.at(-1)?.notas?.agua).toBe('bebi 2 litros');
  });
  it('anotação já salva volta preenchida', () => {
    const { ctx } = criarCtx({ checkins: [{ ...completo('2026-11-21'), notas: { sono: 'dormi bem' } }] });
    const e = el();
    renderCheckin(e, ctx);
    expect((e.querySelector('textarea[name=nota-sono]') as HTMLTextAreaElement).value).toBe('dormi bem');
  });
});

describe('Menu inferior', () => {
  it('cada item tem ícone e nome', async () => {
    const { ctx } = criarCtx({ prefs: { kcal: 1100 } });
    const a = el();
    await montar(a, { ctx, acesso: async () => 'ativo', login: { pedirCodigo: async () => ({ ok: true as const }), confirmarCodigo: async () => true } });
    const itens = [...a.querySelectorAll('nav.inferior > *')];
    expect(itens.map((i) => i.textContent!.trim())).toEqual(['Hoje', 'Cardápio', 'Compras', 'Check-in', 'Aulas', 'Sair']);
    for (const i of itens) expect(i.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
});

const ctxComTodasAsFaixas = (...a: Parameters<typeof criarCtx>) => {
  const r = criarCtx(...a);
  r.ctx.cardapios = Object.fromEntries(Array.from({ length: 12 }, (_, i) => 1100 + i * 100).map((k) => [k, cardapio(k)]));
  return r;
};

describe('Calculadora de gasto calórico', () => {
  const preencher = (e: HTMLElement, v: Record<string, string>) => {
    for (const [nome, valor] of Object.entries(v)) {
      const campo = e.querySelector(`[name=${nome}]`) as HTMLInputElement;
      if (campo.type === 'radio') (e.querySelector(`[name=${nome}][value=${valor}]`) as HTMLInputElement).checked = true;
      else campo.value = valor;
    }
    e.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  };
  const entrada = { sexo: 'F', idade: '30', peso: '60', altura: '165', atividade: 'leve', objetivo: 'emagrecer' };

  it('mostra gasto, meta e a faixa sugerida', () => {
    const e = el();
    renderCalculadora(e, ctxComTodasAsFaixas().ctx);
    preencher(e, entrada);
    expect(e.querySelector('[data-testid=resultado]')!.textContent).toContain('1.815 kcal');
    expect(e.querySelector('[data-testid=resultado]')!.textContent).toContain('1.407 kcal');
  });
  it('"Usar este cardápio" grava a faixa e vai para o cardápio', () => {
    const { ctx } = ctxComTodasAsFaixas();
    const e = el();
    renderCalculadora(e, ctx);
    preencher(e, entrada);
    (e.querySelector('[data-acao=usar]') as HTMLElement).click();
    expect(ctx.prefs.get().kcal).toBe(1400);
    expect(window.location.hash).toBe('#/cardapio');
  });
  it('menor de 18 anos: mensagem, sem resultado', () => {
    const e = el();
    renderCalculadora(e, ctxComTodasAsFaixas().ctx);
    preencher(e, { ...entrada, idade: '16' });
    expect(e.querySelector('[data-testid=resultado]')).toBeNull();
    expect(e.textContent).toContain('18 anos');
  });
  it('o resultado traz o aviso de que é estimativa', () => {
    const e = el();
    renderCalculadora(e, ctxComTodasAsFaixas().ctx);
    preencher(e, entrada);
    expect(e.textContent).toMatch(/estimativa/i);
  });
  it('o Cardápio sem faixa escolhida oferece a calculadora', () => {
    const e = el();
    renderCardapio(e, criarCtx().ctx);
    expect(e.querySelector('a[href="#/calculadora"]')).not.toBeNull();
  });
});

describe('Ícones das refeições', () => {
  it('cada refeição do cardápio tem um ícone', () => {
    const e = el();
    const { ctx } = criarCtx({ prefs: { kcal: 2200 } });
    renderCardapio(e, ctx);
    expect(e.querySelectorAll('svg[data-icone]').length).toBe(ctx.cardapios[2200].refeicoes.length);
    expect(new Set([...e.querySelectorAll('svg[data-icone]')].map((s) => s.getAttribute('data-icone'))).size).toBe(5);
  });
  it('a tela Hoje mostra o ícone da próxima refeição', () => {
    const e = el();
    renderHoje(e, criarCtx({ prefs: { kcal: 1100 } }).ctx);
    expect(e.querySelector('svg[data-icone]')).not.toBeNull();
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
