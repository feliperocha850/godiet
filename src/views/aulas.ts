import type { Contexto } from '../app/contexto';
import { BONUS, carregarBonus, type Bonus } from '../lib/bonus';

/** Abre o PDF numa nova aba; se o navegador bloquear, baixa o arquivo. */
async function abrirPdf(item: Bonus): Promise<void> {
  const blob = await carregarBonus(item);
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, '_blank');
  if (!janela) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.titulo}.pdf`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function renderAulas(el: HTMLElement, ctx: Contexto, abrir: (b: Bonus) => Promise<void> = abrirPdf): void {
  el.innerHTML = `
    <h1>Aulas e materiais</h1>
    <div class="cartao"><p>As aulas do curso continuam na sua área do aluno.</p>
    <a class="botao" href="${ctx.linkAulas}" target="_blank" rel="noopener">Abrir minhas aulas</a></div>
    <h2>Bônus do curso</h2>
    <div role="alert" hidden></div>
    ${BONUS.map((b) => `<div class="cartao"><h3>${b.titulo}</h3><p>${b.descricao}</p>
      <button type="button" class="botao" data-bonus="${b.id}">Abrir PDF</button></div>`).join('')}
    <p><a href="#/privacidade">Privacidade e termos</a></p>`;
  const aviso = el.querySelector('[role=alert]') as HTMLElement;
  el.querySelectorAll<HTMLButtonElement>('[data-bonus]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      const item = BONUS.find((b) => b.id === botao.dataset.bonus)!;
      aviso.hidden = true;
      botao.disabled = true;
      try {
        await abrir(item);
      } catch {
        aviso.textContent = 'Não foi possível abrir este material agora. Confira sua internet e tente de novo.';
        aviso.hidden = false;
      } finally {
        botao.disabled = false;
      }
    });
  });
}
