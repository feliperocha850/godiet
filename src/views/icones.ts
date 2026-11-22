// Ícones "3D" das refeições, desenhados em SVG com degradês e brilho. As cores vêm das variáveis --i-* de theme.css.

const grad = (id: string, c1: string, c2: string) =>
  `<radialGradient id="${id}" cx=".35" cy=".3" r=".85"><stop offset="0" style="stop-color:var(--${c1})"/><stop offset="1" style="stop-color:var(--${c2})"/></radialGradient>`;

const sombra = '<ellipse cx="32" cy="57" rx="19" ry="3.5" style="fill:var(--i-sombra)"/>';
const brilho = (cx: number, cy: number, rx: number, ry: number) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" style="fill:var(--i-luz);opacity:.55"/>`;

const DESENHOS: Record<string, (id: string) => string> = {
  'cafe-da-manha': (i) => `<defs>${grad(`${i}a`, 'i-branco-1', 'i-branco-2')}${grad(`${i}b`, 'i-marrom-1', 'i-marrom-2')}</defs>
    ${sombra}
    <path d="M47 28c10 0 10 13-1 13" fill="none" style="stroke:var(--i-branco-2)" stroke-width="4" stroke-linecap="round"/>
    <path d="M14 24h34v12a17 17 0 0 1-17 17h0a17 17 0 0 1-17-17z" fill="url(#${i}a)"/>
    <ellipse cx="31" cy="24" rx="17" ry="4.5" fill="url(#${i}b)"/>
    ${brilho(22, 38, 3, 8)}
    <path d="M24 17c-3-3 3-5 0-9M33 17c-3-3 3-5 0-9" fill="none" style="stroke:var(--i-branco-2)" stroke-width="2" stroke-linecap="round"/>`,
  'lanche-da-manha': (i) => `<defs>${grad(`${i}a`, 'i-vermelho-1', 'i-vermelho-2')}${grad(`${i}b`, 'i-verde-1', 'i-verde-2')}</defs>
    ${sombra}
    <path d="M32 21c-8-6-20 0-18 14 1 10 8 20 16 18h4c8 2 15-8 16-18 2-14-10-20-18-14z" fill="url(#${i}a)"/>
    <path d="M32 21c0-5 2-9 5-11" fill="none" style="stroke:var(--i-marrom-2)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M36 14c4-5 11-4 12-2-3 5-9 6-12 2z" fill="url(#${i}b)"/>
    ${brilho(23, 33, 3.5, 7)}`,
  'almoco': (i) => `<defs>${grad(`${i}a`, 'i-branco-1', 'i-branco-2')}${grad(`${i}b`, 'i-marrom-1', 'i-marrom-2')}${grad(`${i}c`, 'i-verde-1', 'i-verde-2')}</defs>
    <ellipse cx="32" cy="55" rx="26" ry="4" style="fill:var(--i-sombra)"/>
    <ellipse cx="32" cy="40" rx="28" ry="15" fill="url(#${i}a)"/>
    <ellipse cx="32" cy="38" rx="20" ry="10" style="fill:var(--i-branco-2);opacity:.6"/>
    <ellipse cx="23" cy="38" rx="9" ry="5.5" style="fill:var(--i-branco-1)"/>
    <ellipse cx="41" cy="39" rx="8" ry="5" fill="url(#${i}b)"/>
    <circle cx="30" cy="31" r="5.5" fill="url(#${i}c)"/><circle cx="36" cy="30" r="4.5" fill="url(#${i}c)"/><circle cx="25" cy="32" r="4" fill="url(#${i}c)"/>
    ${brilho(18, 33, 5, 1.8)}`,
  'lanche-da-tarde': (i) => `<defs>${grad(`${i}a`, 'i-amarelo-1', 'i-amarelo-2')}</defs>
    ${sombra}
    <path d="M13 17c1 25 21 40 41 26 2-2 0-4-3-3-15 8-26-2-27-26z" fill="url(#${i}a)"/>
    <path d="M13 17c-1-4 5-5 7-1" style="fill:var(--i-marrom-2)"/>
    <circle cx="53" cy="43" r="2.4" style="fill:var(--i-marrom-2)"/>
    <path d="M18 24c3 14 11 22 22 24" fill="none" style="stroke:var(--i-luz);opacity:.6" stroke-width="2.4" stroke-linecap="round"/>`,
  'jantar': (i) => `<defs>${grad(`${i}a`, 'i-marrom-1', 'i-marrom-2')}${grad(`${i}b`, 'i-amarelo-1', 'i-amarelo-2')}</defs>
    ${sombra}
    <path d="M8 31h48a24 21 0 0 1-48 0z" fill="url(#${i}a)"/>
    <ellipse cx="32" cy="31" rx="24" ry="6" fill="url(#${i}b)"/>
    <ellipse cx="32" cy="31" rx="24" ry="6" fill="none" style="stroke:var(--i-marrom-2)" stroke-width="1.5"/>
    <circle cx="26" cy="30" r="2.2" style="fill:var(--i-verde-2)"/><circle cx="37" cy="32" r="2" style="fill:var(--i-vermelho-2)"/>
    ${brilho(18, 41, 3, 6)}
    <path d="M24 22c-3-3 3-5 0-9M34 22c-3-3 3-5 0-9" fill="none" style="stroke:var(--i-branco-2)" stroke-width="2" stroke-linecap="round"/>`,
};

/** Ícone da refeição (pelo id do cardápio); refeições desconhecidas ganham o prato. */
export function iconeRefeicao(id: string): string {
  const chave = id in DESENHOS ? id : 'almoco';
  return `<svg class="icone-refeicao" data-icone="${chave}" viewBox="0 0 64 64" width="44" height="44" role="img" aria-label="Ícone de ${chave.replace(/-/g, ' ')}">${DESENHOS[chave](`ic-${chave}`)}</svg>`;
}
