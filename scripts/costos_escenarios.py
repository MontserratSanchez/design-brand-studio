#!/usr/bin/env python3
"""Escenarios mensuales de costo (guía p. 10) a partir del registro medido costos/costos.csv.

Uso: python3 scripts/costos_escenarios.py  →  imprime las tablas que se copian en costos/escenarios.md
Todo lo que no sale de costos.csv es un SUPUESTO declarado aquí arriba, con su fuente.
"""
import csv, collections, os

RAIZ = os.path.join(os.path.dirname(__file__), '..')
filas = list(csv.DictReader(open(os.path.join(RAIZ, 'costos', 'costos.csv'))))

# ---- Clasificación de casos (dato: tabla privada `casos`, exportada el 2026-11-05) ----
RUTA = {
    'DBS-20261104-GRPF': 'completo_sin_correccion', 'DBS-20261105-VMC2': 'completo_sin_correccion',
    'DBS-20261105-PBT2': 'completo_sin_correccion', 'DBS-20261105-ZYFZ': 'completo_sin_correccion',
    'DBS-20261105-QN6A': 'completo_sin_correccion', 'DBS-20261105-T6RE': 'completo_sin_correccion',  # rechazado por la coordinadora: el proceso sí se completó
    'DBS-20261105-QWWR': 'completo_con_correccion',
    'DBS-20261105-TTM6': 'cierre_temprano', 'DBS-20261105-G87G': 'cierre_temprano', 'DBS-20261105-YCHN': 'cierre_temprano',
    'DBS-20261105-HUPJ': 'detenido_limite',
    'DBS-20261104-TEST': 'desarrollo', 'DBS-20261104-PRB1': 'desarrollo',
}

por_caso = collections.defaultdict(lambda: {'usd': 0.0, 'llamadas': 0, 'tin': 0, 'tout': 0})
for f in filas:
    c = por_caso[f['caso_id']]
    c['usd'] += float(f['costo_usd'] or 0)
    c['llamadas'] += 1
    c['tin'] += int(f['tokens_entrada'] or 0)
    c['tout'] += int(f['tokens_salida'] or 0)

por_ruta = collections.defaultdict(list)
for caso, v in por_caso.items():
    por_ruta[RUTA.get(caso, 'sin_clasificar')].append(v['usd'])
prom = {r: sum(v) / len(v) for r, v in por_ruta.items()}

# ---- Supuestos de escenario (declarados) ----
MEZCLA = {  # proporción de casos por ruta
    'base':  {'completo_sin_correccion': 0.70, 'completo_con_correccion': 0.15, 'cierre_temprano': 0.10, 'detenido_limite': 0.05},
    'mayor': {'completo_sin_correccion': 0.45, 'completo_con_correccion': 0.40, 'cierre_temprano': 0.05, 'detenido_limite': 0.10},
}
VOZ = {'base': (0.20, 2.0), 'mayor': (0.50, 4.0)}          # (fracción de casos por voz, minutos por conversación)
USD_MIN_VOZ = 0.08                                         # ElevenAgents, minuto incluido (elevenlabs.io/pricing/agents, consulta 2026-11-05)
EJEC_POR_CASO = {'base': 9, 'mayor': 12}                  # W1 + W2 + 4–6 W3 + W5 + aprobación (+ correcciones)
EJEC_FIJAS_MES = 24 * 30 + 30                              # vencimiento cada hora + exportación diaria
N8N = [(2500, 20, 'Starter'), (10000, 50, 'Pro')]          # € / mes, facturación anual (n8n.io/pricing, consulta 2026-11-05)
EUR_USD = None                                             # sin tipo de cambio verificado: n8n se reporta en EUR aparte

def plan_n8n(ejec):
    for limite, eur, nombre in N8N:
        if ejec <= limite:
            return nombre, eur
    return 'Enterprise o self-hosted (cotización)', None

print('## Costo medido por ruta (USD por caso, tarifa Haiku 5.5 0.10/0.50)')
for r, v in sorted(prom.items()):
    print(f'| {r} | n = {len(por_ruta[r])} | {v:.7f} |')

for esc in ('base', 'mayor'):
    llm_caso = sum(MEZCLA[esc][r] * prom[r] for r in MEZCLA[esc])
    print(f'\n## Escenario {esc}: LLM por caso = {llm_caso:.6f} USD')
    for n in (100, 1000, 10000):
        frac, minutos = VOZ[esc]
        min_voz = n * frac * minutos
        ejec = n * EJEC_POR_CASO[esc] + EJEC_FIJAS_MES
        nombre, eur = plan_n8n(ejec)
        print(f'| {n} | LLM {n * llm_caso:.2f} USD | voz {min_voz:.0f} min ≈ {min_voz * USD_MIN_VOZ:.2f} USD | n8n {ejec} ejec → {nombre} {eur if eur else "?"} € |')
