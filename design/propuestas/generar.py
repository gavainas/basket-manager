"""Láminas vectoriales de revisión. No son capturas del juego ni nuevas pantallas activas.
Ejecutar desde la raíz: python3 design/propuestas/generar.py
Requiere fontTools. Reutiliza el arte y Oswald del repositorio.
"""
from pathlib import Path
from html import escape
import json, base64, textwrap, subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'design/propuestas'
d=json.loads((OUT/'estado.json').read_text())
font=TTFont(ROOT/'node_modules/@fontsource/oswald/files/oswald-latin-700-normal.woff')
glyphs=font.getGlyphSet(); cmap=font.getBestCmap(); upem=font['head'].unitsPerEm
C={'bg':'#d8d4cc','paper':'#f6f4f1','inset':'#eceae6','ink':'#25282c','dim':'#565b62','line':'#d2cec8','chrome':'#32353a','orange':'#e07a2a','pine':'#2f6b4f','blue':'#2d5c8a','red':'#9d3b3b','violet':'#6a4a86'}
parts=[]
image_cache={}
def box(x,y,w,h,fill='paper',stroke=None,rx=4):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{C.get(fill,fill)}"'+(f' stroke="{C.get(stroke,stroke)}"' if stroke else '')+'/>')
def line(x1,y1,x2,y2,color='line'):
    parts.append(f'<path d="M{x1} {y1}H{x2}" stroke="{C.get(color,color)}"/>' if y1==y2 else f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{C.get(color,color)}"/>')
def text(x,y,s,size=14,color='ink',bold=False):
    parts.append(f'<text x="{x}" y="{y}" fill="{C.get(color,color)}" font-family="DejaVu Sans, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}">{escape(str(s))}</text>')
def display(x,y,s,size=28,color='ink'):
    # Oswald empaquetada convertida a curvas: misma tipografía en cualquier visor.
    chunks=[];offset=0
    for char in str(s):
        name=cmap.get(ord(char),'.notdef'); g=glyphs[name]; pen=SVGPathPen(glyphs);g.draw(pen)
        chunks.append(f'<path d="{pen.getCommands()}" transform="translate({offset} 0)"/>');offset+=g.width
    parts.append(f'<g role="img" aria-label="{escape(str(s))}" fill="{C.get(color,color)}" transform="translate({x} {y}) scale({size/upem} {-size/upem})">'+''.join(chunks)+'</g>')
def picture(file,x,y,w,h):
    if file not in image_cache:
        code="const sharp=require(require.resolve('sharp',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));sharp(process.argv[1]).resize({width:process.argv[1].includes('cab-')?800:160}).png().toBuffer().then(b=>process.stdout.write(b.toString('base64')));"
        image_cache[file]=subprocess.check_output(['node','-e',code,str(ROOT/file)],text=True)
    b=image_cache[file]; ident=f'clip{len(parts)}'
    parts.append(f'<defs><clipPath id="{ident}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3"/></clipPath></defs><image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#{ident})" xlink:href="data:image/png;base64,{b}"/>')
def panel(x,y,w,h,label,color='pine'):
    box(x,y+3,w,h,'#c4c0b8');box(x,y,w,h,'paper','line');line(x+1,y+1,x+w-1,y+1,'#ffffff');box(x,y,w,31,color,rx=3);display(x+15,y+22,label.upper(),16,'paper')
def bodylines(x,y,s,width=45,size=13,color='dim'):
    for i,t in enumerate(textwrap.wrap(s,width)):text(x,y+i*20,t,size,color)
def primary(x,y,w,label):
    box(x,y,w,44,'orange','#b95f1c');display(x+17,y+29,label,19,'#2a1a08');text(x+w-29,y+29,'→',23,'#2a1a08')
def header(option):
    box(0,0,1366,768,'bg',rx=0);box(0,0,1366,60,'chrome',rx=0)
    display(24,38,'BASKET MANAGER',24,'paper')
    nav=['Tablero','Semana','Plantilla','Liga','Finanzas','El club','Historia']
    for i,n in enumerate(nav):
        x=295+i*136
        text(x,35,n,14,'paper',i==0)
        if i==0:box(x-9,53,94,4,'pine',rx=0)
    text(24,94,'TEMPORADA 1   /   SEMANA 4 DE 9   /   PLANIFICACIÓN',12,'dim',True)
    display(24,126,d['club']['name'].upper(),29)
    text(1128,93,'VIERNES 24 DE ABRIL',12,'dim',True)
    text(1128,119,f"{d['position']}° en la liga · 2 ganados, 1 perdido",12,'dim')
def footer():
    box(0,704,1366,64,'chrome',rx=0)
    vals=[('CAJA DEL CLUB',f"$ {d['club']['money']}"),('CUOTAS AL DÍA',f"{sum(p['weeksUnpaid']==0 for p in d['players'])} / {len(d['players'])}"),('CLIMA DEL GRUPO',f"{d['club']['socialClimate']} / 100"),('RÉCORD','2–1')]
    for i,(k,v) in enumerate(vals):
        x=24+i*230;text(x,725,k,10,'#d2cec8',True);display(x,754,v,25,'paper')
        line(x+202,718,x+202,755,'#55595e')
    text(988,730,'Todavía no enviaste la convocatoria.',12,'paper')
    text(988,751,'Primero elegí las gestiones de la semana.',12,'#d2cec8')
def players():
    text(24,563,'EL PLANTEL',12,'ink',True);text(1090,563,'13 jugadores · ver plantilla →',12,'dim')
    aliases={'talentoso_informal':'talentoso'}
    for i,p in enumerate(d['players']):
        x=24+i*102;box(x,575,94,112,'paper','line');picture(f"public/arte/p-{aliases.get(p['personality'],p['personality'])}.webp",x+15,581,64,64)
        name=p['name'].split('"')[1] if '"' in p['name'] else p['name'].split()[-1]
        text(x+7,663,name,12,'ink',True)
        pos={'Base':'B','Escolta':'E','Alero':'A','Ala-Pívot':'AP','Pívot':'P'}[p['position']]
        text(x+7,679,f"{pos} · físico {p['physical']}",10,'dim')
def attention(x,y,w):
    panel(x,y,w,182,'El vestuario pide atención','red')
    display(x+16,y+66,'4 JUGADORES CON RECLAMOS',20)
    bodylines(x+16,y+90,'Pereyra reclama minutos. Techera, Tato y Viera están molestos por la plata.',width=42 if w>400 else 31,size=13)
    line(x+16,y+133,x+w-16,y+133)
    text(x+16,y+156,'3 cuotas pendientes',13,'ink',True);text(x+w-110,y+156,'Ver cuotas →',12,'violet')
def last(x,y,w,h=194):
    panel(x,y,w,h,'Último partido','blue')
    display(x+16,y+76,f"{d['last']['scoreFor']} – {d['last']['scoreAgainst']}",37)
    text(x+154,y+70,'GANAMOS',12,'pine',True)
    text(x+16,y+102,f"vs {d['last']['rivalName']}",13,'ink')
    text(x+16,y+128,f"Figura: {d['last']['mvpName']}",13,'dim')
    text(x+16,y+161,'Abrir informe →',13,'blue',True)
def match(x,y,w,compact=False):
    text(x,y,'PRÓXIMO PARTIDO · VISITANTE',12,'blue',True)
    display(x,y+44,d['rival'].upper(),30 if compact else 38)
    text(x,y+75,'Lunes 27 de abril · 20:00',14,'ink',True)
    text(x,y+98,d['venue'],13,'dim')
    text(x,y+130,'Ver rival y calendario →',13,'blue',True)
def a():
    header('A')
    panel(24,143,834,281,'La próxima fecha','blue')
    match(45,204,440)
    picture('public/arte/cab-vestuario.webp',484,174,373,249)
    panel(24,440,834,96,'Tu próxima decisión')
    display(42,503,'ELEGÍ HASTA 2 GESTIONES',23)
    text(42,523,'Entrenar, cuidar el grupo o atender la caja. Llevás 0 de 2.',12,'dim')
    primary(603,480,237,'Decidir la semana')
    attention(878,143,464);last(878,341,464,195)
    players();footer()
def b():
    header('B')
    picture('public/arte/cab-vestuario.webp',24,143,284,167)
    panel(24,323,284,213,'La próxima fecha','blue')
    match(40,383,260,True)
    panel(326,143,652,393,'La semana en tus manos')
    text(346,208,'AHORA · VIERNES',12,'pine',True)
    display(346,249,'¿QUÉ NECESITA EL CLUB?',31)
    text(346,279,'Elegí hasta 2 gestiones antes de pasar lista.',15,'ink')
    text(346,306,'Entrenar, cuidar el grupo o atender la caja.',13,'dim')
    box(346,328,612,45,'inset','line');text(362,356,'GESTIONES ELEGIDAS',11,'dim',True);display(858,360,'0 / 2',24)
    primary(346,389,612,'Decidir la semana')
    line(346,449,958,449)
    text(346,475,'DESPUÉS',11,'dim',True)
    text(346,504,'Pasar lista',14,'ink',True);text(544,504,'Armar quinteto',14,'ink',True);text(774,504,'Jugar el partido',14,'ink',True)
    text(504,504,'→',18,'dim');text(732,504,'→',18,'dim')
    attention(998,143,344);last(998,341,344,195)
    players();footer()
for key,fn,title in [('a',a,'A · La próxima fecha'),('b',b,'B · La semana en tus manos')]:
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1366" height="768" viewBox="0 0 1366 768"><title>{title} · propuesta de tablero, datos de prueba</title>'];fn();parts.append('</svg>');(OUT/f'tablero-{key}.svg').write_text(''.join(parts))
print('Generadas las dos láminas SVG con los mismos datos.')
