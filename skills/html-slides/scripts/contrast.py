"""Contraste WCAG de los colores del tema.

Uso: python3 contrast.py <bg> <fg> <muted> <accent>     (hex sin #)
Ejemplo: python3 contrast.py eaf1ef 1d2a2b 4f5f5c 25685a
"""
import sys


def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a, b):
    hi, lo = sorted([lum(a), lum(b)], reverse=True)
    return (hi + 0.05) / (lo + 0.05)


bg, fg, muted, accent = [x.lstrip('#') for x in sys.argv[1:5]]
ok = True
for name, col, need in [("fg", fg, 7.0), ("muted", muted, 4.5), ("accent", accent, 4.5)]:
    r = ratio(col, bg)
    passed = r >= need
    ok &= passed
    print(f"{name:7} {r:5.2f}:1  (mínimo {need})  {'OK' if passed else 'SUBE EL CONTRASTE'}")
sys.exit(0 if ok else 1)
