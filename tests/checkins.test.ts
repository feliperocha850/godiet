import { describe, it, expect } from 'vitest';
import { salvarCheckin, sincronizarPendentes, pendentes, type DepsCheckin } from '../src/lib/checkins';
import type { CheckIn } from '../src/domain/types';

const ci = (dia: string, agua = true): CheckIn => ({ dia, alimentacao: false, agua, movimento: false, sono: false, deus: false });

function deps(enviar: DepsCheckin['enviar']) {
  const mem = new Map<string, string>();
  const d: DepsCheckin = {
    enviar,
    storage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) },
  };
  return { d, mem };
}

describe('salvarCheckin', () => {
  it('com internet → salvo, nada na fila', async () => {
    const enviados: CheckIn[] = [];
    const { d } = deps(async (x) => void enviados.push(x));
    expect(await salvarCheckin(ci('2026-11-21'), d)).toBe('salvo');
    expect(enviados).toHaveLength(1);
    expect(await sincronizarPendentes(d)).toBe(0);
  });

  it('sem internet → pendente, e sincroniza depois', async () => {
    let online = false;
    const enviados: CheckIn[] = [];
    const { d } = deps(async (x) => {
      if (!online) throw new TypeError('Failed to fetch');
      enviados.push(x);
    });
    expect(await salvarCheckin(ci('2026-11-21'), d)).toBe('pendente');
    online = true;
    expect(await sincronizarPendentes(d)).toBe(1);
    expect(enviados.map((x) => x.dia)).toEqual(['2026-11-21']);
    expect(await sincronizarPendentes(d)).toBe(0);
  });

  it('salvar o mesmo dia duas vezes offline guarda só a versão mais nova', async () => {
    const enviados: CheckIn[] = [];
    let online = false;
    const { d } = deps(async (x) => {
      if (!online) throw new Error('offline');
      enviados.push(x);
    });
    await salvarCheckin(ci('2026-11-21', false), d);
    await salvarCheckin({ ...ci('2026-11-21'), sono: true }, d);
    online = true;
    expect(await sincronizarPendentes(d)).toBe(1);
    expect(enviados[0].sono).toBe(true);
  });

  it('se a sincronização falha no meio, o que não foi enviado continua na fila', async () => {
    let falhar = true;
    const { d } = deps(async (x) => {
      if (falhar && x.dia === '2026-11-22') throw new Error('offline');
    });
    d.enviar = async () => { throw new Error('offline'); };
    await salvarCheckin(ci('2026-11-21'), d);
    await salvarCheckin(ci('2026-11-22'), d);
    const enviados: string[] = [];
    d.enviar = async (x) => {
      if (falhar && x.dia === '2026-11-22') throw new Error('offline');
      enviados.push(x.dia);
    };
    expect(await sincronizarPendentes(d)).toBe(1);
    falhar = false;
    expect(await sincronizarPendentes(d)).toBe(1);
    expect(enviados).toEqual(['2026-11-21', '2026-11-22']);
  });

  it('fila corrompida no armazenamento não derruba o app', async () => {
    const { d, mem } = deps(async () => {});
    mem.set('checkins-pendentes', '{isso não é json');
    expect(await sincronizarPendentes(d)).toBe(0);
    expect(await salvarCheckin(ci('2026-11-21'), d)).toBe('salvo');
  });
});

describe('erros de permissão (acesso bloqueado) não viram "guardado para depois"', () => {
  it.each([{ code: '42501' }, { status: 403 }, { status: 401 }])('%j → recusado e nada na fila', async (erro) => {
    const { d, mem } = deps(async () => { throw Object.assign(new Error('rls'), erro); });
    expect(await salvarCheckin(ci('2026-11-21'), d)).toBe('recusado');
    expect(mem.size).toBe(0);
  });
});

describe('ordem dos salvamentos', () => {
  it('toques rápidos são enviados um de cada vez, na ordem', async () => {
    const enviados: boolean[] = [];
    const { d } = deps(async (x) => {
      await new Promise((r) => setTimeout(r, x.agua ? 20 : 0));
      enviados.push(x.agua);
    });
    const a = salvarCheckin(ci('2026-11-21', true), d);
    const b = salvarCheckin(ci('2026-11-21', false), d);
    await Promise.all([a, b]);
    expect(enviados).toEqual([true, false]);
  });
});

describe('pendências por usuário (celular compartilhado)', () => {
  it('a fila de uma conta não é enviada na conta de outra', async () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    const enviadosB: CheckIn[] = [];
    const a: DepsCheckin = { enviar: async () => { throw new Error('offline'); }, storage, usuario: 'a@x.com' };
    const b: DepsCheckin = { enviar: async (x) => void enviadosB.push(x), storage, usuario: 'b@x.com' };
    await salvarCheckin(ci('2026-11-21'), a);
    expect(await sincronizarPendentes(b)).toBe(0);
    expect(enviadosB).toEqual([]);
    expect(pendentes(b)).toEqual([]);
    expect(pendentes(a).map((x) => x.dia)).toEqual(['2026-11-21']);
  });
});
