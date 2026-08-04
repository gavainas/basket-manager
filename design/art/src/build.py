#!/usr/bin/env python3
"""Empotra las fuentes woff2 como data URIs en el HTML final."""
import base64
import pathlib

BASE = pathlib.Path("/tmp/claude-0/-home-user-basket-manager/5037781a-98a3-5d29-99ba-f87fca8cc31a/scratchpad")
FONTS = BASE / "fonts"
OUT = pathlib.Path("/home/user/basket-manager/design/art/puerta2-tipografia-iconos.html")

# (archivo, family, weight)
FACES = [
    ("archivo-400", "Archivo", 400),
    ("archivo-600", "Archivo", 600),
    ("archivo-700", "Archivo", 700),
    ("archivoblack-400", "Archivo Black", 400),
    ("bebas-400", "Bebas Neue", 400),
    ("barlow-400", "Barlow", 400),
    ("barlow-600", "Barlow", 600),
    ("barlow-700", "Barlow", 700),
    ("anton-400", "Anton", 400),
    ("plex-400", "IBM Plex Sans", 400),
    ("plex-600", "IBM Plex Sans", 600),
    ("plex-700", "IBM Plex Sans", 700),
    ("caveat-600", "Caveat", 600),
]

css = []
total = 0
for name, family, weight in FACES:
    path = FONTS / f"{name}.woff2"
    raw = path.read_bytes()
    total += len(raw)
    b64 = base64.b64encode(raw).decode("ascii")
    css.append(
        "@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;"
        "src:url(data:font/woff2;base64,%s) format('woff2');}" % (family, weight, b64)
    )

template = (BASE / "menu.template.html").read_text(encoding="utf-8")
assert "/*FONTS*/" in template, "falta el marcador /*FONTS*/"
final = template.replace("/*FONTS*/", "\n".join(css))

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(final, encoding="utf-8")
print(f"fuentes: {total/1024:.0f} KB crudas -> HTML final {len(final.encode())/1024:.0f} KB")
print(OUT)
