// Ícones de linha do menu inferior (usam a cor do texto do botão).
const svg = (corpo: string) =>
  `<svg class="icone-menu" aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${corpo}</svg>`;

export const ICONES_MENU = {
  /** Calendário */
  hoje: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none"/>'),
  /** Cardápio: cartão de menu com garfo */
  cardapio: svg('<rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>'),
  /** Lista de compras */
  compras: svg('<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><path d="m3.8 6.5 1.2 1.2 2-2.4M3.8 12l1.2 1.2 2-2.4M3.8 17.5l1.2 1.2 2-2.4"/>'),
  /** Check-in: círculo com marca de verificado */
  checkin: svg('<circle cx="12" cy="12" r="9"/><path d="m7.8 12.4 3 3 5.6-6.2"/>'),
  /** Aulas: tela com botão de reproduzir */
  aulas: svg('<rect x="3" y="4.5" width="18" height="12.5" rx="2.5"/><path d="m10.3 8.3 4.2 2.45-4.2 2.45z" fill="currentColor"/><path d="M8 20.5h8"/>'),
  /** Sair: porta com seta */
  sair: svg('<path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10"/><path d="M15 8.5 19 12l-4 3.5M19 12H9.5"/>'),
};
