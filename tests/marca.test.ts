// @vitest-environment jsdom
window.scrollTo = () => {}; // jsdom não implementa a rolagem
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { criarCtx } from './helpers/ctx';
import { montar } from '../src/app';
import { renderLogin } from '../src/views/login';
import { marcaHtml } from '../src/views/util';

const el = () => document.createElement('div');
const login = { pedirCodigo: async () => ({ ok: true as const }), confirmarCodigo: async () => true };

describe('marca GODIET', () => {
  it('GOD em negrito e IET normal', () => {
    const d = el();
    d.innerHTML = marcaHtml();
    expect(d.textContent).toBe('GODIET');
    expect(d.querySelector('strong')!.textContent).toBe('GOD');
    expect(d.querySelector('.marca')!.lastChild!.textContent).toBe('IET');
  });
  it('aparece no topo do app logado, antes do conteúdo', async () => {
    const a = el();
    await montar(a, { ctx: criarCtx().ctx, acesso: async () => 'ativo', login });
    const topo = a.querySelector('header.topo')!;
    expect(topo.textContent).toBe('GODIET');
    expect(a.firstElementChild).toBe(topo);
  });
  it('o ícone do app aparece ao lado do nome, no topo', async () => {
    const a = el();
    await montar(a, { ctx: criarCtx().ctx, acesso: async () => 'ativo', login });
    const img = a.querySelector('header.topo img.logo') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('alt')).toBe('');
    expect(a.querySelector('header.topo')!.firstElementChild).toBe(img);
  });
  it('aparece na tela de login', () => {
    const a = el();
    renderLogin(a, login, () => {});
    expect(a.querySelector('.marca')).not.toBeNull();
  });
});

describe('nome do app', () => {
  it('título da página e manifesto dizem GODIET', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<title>GODIET</title>');
    const cfg = readFileSync('vite.config.ts', 'utf8');
    expect(cfg).toContain("name: 'GODIET'");
    expect(cfg).toContain("short_name: 'GODIET'");
  });
  it('o iPhone usa o ícone na tela inicial', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('rel="apple-touch-icon"');
  });
  it('ícone do app existe nos tamanhos do manifesto', () => {
    expect(existsSync('public/icon-192.png')).toBe(true);
    expect(existsSync('public/icon-512.png')).toBe(true);
  });
  it('títulos das telas são menores que o título do app (ficam discretos)', () => {
    const css = readFileSync('src/theme.css', 'utf8');
    expect(css).toMatch(/h1\s*\{[^}]*font-size:\s*1\.1\d*rem/);
  });
});
