# GODIET (app do curso "Códigos do Emagrecimento e Saúde")

PWA para os alunos: 12 cardápios, lista de compras, versículo/oração antes das refeições e check-in diário.

- Desenho: `docs/superpowers/specs/2026-11-21-app-curso-habitos-design.md`
- Plano: `docs/superpowers/plans/2026-11-21-app-curso-habitos.md`
- Lançamento e operação (Resend, Eduzz, bônus, admin): `docs/lancamento.md`

Comandos: `npm test` (testes), `npm run build`, `npm run dev`. Configuração em `.env.example`.
Cardápios: `python3 tools/extract_cardapios.py <pdfs> src/data/cardapios` e `python3 tools/verificar_cardapios.py <pdfs> src/data/cardapios`.
