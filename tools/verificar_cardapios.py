#!/usr/bin/env python3
"""Confere os JSON dos cardápios contra os PDFs: nada perdido e nada a mais nas tabelas.

Compara as "palavras" (com contagem) das tabelas "refeição padrão / pode substituir por"
do PDF com as dos itens e substituições do JSON.
Uso: python3 tools/verificar_cardapios.py <pasta_com_pdfs> <pasta_json>
"""
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

TOKEN = re.compile(r"[\wÀ-ÿ½¼]+", re.U)
IGNORAR_RAW = {"sem", "substituição"}
EXTRAS_JSON = {"mesma", "porção"}  # rótulo "mesma porção" repetido nas substituições


def tokens(texto):
    return Counter(t.lower() for t in TOKEN.findall(texto))


def texto_itens(cardapio):
    partes = []

    def item(i):
        partes.append(i["nome"] + " " + i.get("detalhe", "") + " " + i["porcao"])
        for s in i["substituicoes"]:
            partes.append(s["nome"] + " " + s.get("detalhe", "") + " " + s["porcao"])

    for r in cardapio["refeicoes"]:
        for i in r["padrao"]:
            item(i)
        for i in r.get("substituta", {}).get("itens", []):
            item(i)
    return " ".join(partes)


def texto_tabelas(texto_pdf):
    dentro, linhas = False, []
    for l in texto_pdf.split("\n"):
        s = re.sub(r"\s+", "", l)
        if "PODESUBSTITUIRPOR" in s:
            dentro = True
            continue
        if s.startswith(("SUGESTÕES", "VEGETAIS", "SALADA", "REFEIÇÃOSUBSTITUTA", "OBSERVAÇÃO", "ALÉMDOPRATO", "HÁBITOS", "CARDÁPIO", "Obs:")) or re.match(r"^\d{2}:\d{2}$", s):
            dentro = False
        if dentro and l.strip():
            linhas.append(l)
    return "\n".join(linhas)


def main():
    pdfs, jsons = Path(sys.argv[1]), Path(sys.argv[2])
    ruim = False
    for pdf in sorted(pdfs.glob("*Cardapio_*kcal.pdf")):
        kcal = re.search(r"(\d{4})kcal", pdf.name).group(1)
        raw = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout
        dados = json.loads((jsons / f"{kcal}.json").read_text(encoding="utf-8"))
        a = tokens(texto_tabelas(raw))
        for t in IGNORAR_RAW:
            a.pop(t, None)
        b = tokens(texto_itens(dados))
        perdidos = {t: n - b[t] for t, n in a.items() if b[t] < n}
        a_mais = {t: n - a[t] for t, n in b.items() if a[t] < n and t not in EXTRAS_JSON}
        ok = not perdidos and not a_mais
        ruim |= not ok
        print(f"{kcal}: {'OK' if ok else ''}{'' if not perdidos else ' PERDIDOS ' + str(perdidos)}{'' if not a_mais else ' A MAIS ' + str(a_mais)}")
    sys.exit(1 if ruim else 0)


if __name__ == "__main__":
    main()
