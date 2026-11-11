# OPERATOR — korosklo

## Co a proč
Klikatelna ukazka noveho webu KORO-SKLO s.r.o. (Plzen) vcetne administrace obsahu a ukazky CRM: poptavky, cenove nabidky, zakazky, sklad, faktury.

## Kde jsme
Viz STATE.md (generuje harness). Poslední shrnutí operátora: —

## Rozhodnutí
- 2026-11-11: projekt založen.

## Pravidla projektu
- Stack: python
- Testy: `uv run pytest -q`
- Nic nad rámec harnessu; obecná pravidla jsou v ~/factory/docs.

## Jak spustit
- `factory run` — spustí běh (kontrakty → workeři → brány → checkpointy)
- `factory status` — stav, otevřené balíčky
- `factory packets` — balíčky čekající na rozhodnutí; `factory answer <id> …`
