import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const VARS = ['--verde-claro', '--verde-escuro', '--texto', '--fundo', '--destaque'];

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : [p];
  });
}

describe('tema', () => {
  it('define as cinco variáveis de cor em src/theme.css', () => {
    const css = readFileSync('src/theme.css', 'utf8');
    for (const v of VARS) expect(css).toContain(`${v}:`);
  });

  it('nenhum outro arquivo de src usa cor hexadecimal literal', () => {
    const ruins = arquivos('src')
      .filter((f) => !f.endsWith('theme.css') && /\.(ts|css|html)$/.test(f))
      .filter((f) => /#[0-9a-fA-F]{3,6}\b/.test(readFileSync(f, 'utf8')));
    expect(ruins).toEqual([]);
  });
});
