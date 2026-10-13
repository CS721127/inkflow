#!/usr/bin/env python3
"""Rebuild extra original A4 vector stationery and gallery previews (local-only)."""
import json, math, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import cairosvg, io
root=Path(__file__).resolve().parents[1]
artdir=root/'assets/stationery/art'
previews=root/'assets/stationery/previews'
artdir.mkdir(parents=True,exist_ok=True)
previews.mkdir(parents=True,exist_ok=True)


def svg(body, base='#fffefd'):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" preserveAspectRatio="none" role="presentation" aria-hidden="true"><rect width="210" height="297" fill="{base}"/>{body}</svg>'

def sakura(x,y,scale=1,angle=0):
 petals=''.join(f'<ellipse cx="0" cy="-3.4" rx="2.55" ry="4.0" fill="{col}" stroke="#e8a6ba" stroke-width=".27" transform="rotate({n*72})"/>' for n,col in enumerate(['#f8c6d8','#ffe0e8','#f6bbcf','#f9d1df','#fbe0e6']))
 return f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})">{petals}<circle r="1.7" fill="#e8b74b"/><circle r=".65" fill="#fff5a1"/></g>'

def leaf(x,y,ang=0,sc=1,color='#8ab59a'):
 return f'<g transform="translate({x} {y}) rotate({ang}) scale({sc})"><path d="M0 0Q-5 -5 0 -13Q6 -7 0 0Z" fill="{color}" stroke="#588873" stroke-width=".28"/><path d="M0 0L0 -11" stroke="#689c7b" stroke-width=".30"/></g>'

def star(x,y,r=1.8,color='#edcd85'):
 points=[]
 for i in range(10):
  a=math.pi*(-.5 + i/5)
  rad=r if i%2==0 else r*.34
  points.append(f'{x+rad*math.cos(a):.2f},{y+rad*math.sin(a):.2f}')
 return f'<polygon points="{" ".join(points)}" fill="{color}"/>'

def bean(x,y,rot=0,s=1):
 return f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><ellipse rx="3.8" ry="5.5" fill="#a86c48" stroke="#815138" stroke-width=".35"/><path d="M-1 -4 Q2 -2 -1 0Q-3 3 1 4" fill="none" stroke="#f1cfaf" stroke-width=".7" stroke-linecap="round"/></g>'

# 1. Sakura stationery: delicate pink branches and petals; vector on every page.
sak='''<rect width="210" height="13" fill="#fff0f5"/>
<rect y="287" width="210" height="10" fill="#fff0f5"/>
<path d="M0 37Q13 24 27 18Q36 13 47 4M210 256Q199 272 186 278Q178 286 169 297" stroke="#aa7c7c" stroke-width="1" fill="none" stroke-linecap="round"/>
<path d="M17 25Q15 15 12 7M26 18Q36 21 38 27M191 273Q202 271 205 263M179 285Q174 278 174 274" stroke="#ad8083" stroke-width=".6" fill="none"/>
<path d="M38 14H171" stroke="#f5ccd8" stroke-width=".45" stroke-dasharray="1.5 1.4"/>
<path d="M43 284H167" stroke="#f5ccd8" stroke-width=".45" stroke-dasharray="1.5 1.4"/>'''
for x,y,sc,ang in [(14,27,1.5,10),(27,18,1.05,22),(39,8,.9,-14),(35,26,.63,30),(187,277,1.35,-20),(202,265,.85,30),(177,288,.7,-30)]:sak+=sakura(x,y,sc,ang)
for x,y,rot in [(53,21,25),(177,33,-42),(18,103,-40),(197,206,53),(151,283,35)]:
 sak+=f'<g transform="translate({x} {y}) rotate({rot})"><ellipse cy="-2" ry="3.1" rx="1.9" fill="#f8dae5" stroke="#efbbc9" stroke-width=".26"/><path d="M0 -1v3" stroke="#efb1bf" stroke-width=".25"/></g>'
sak+='''<path d="M15 42V257M195 42V257" stroke="#f5e3e8" stroke-width=".4"/>'''

# 2. Botanical: herbarium inspired sage, muted green vine corners.
bot='''<rect x="9" y="9" width="192" height="279" rx="1.2" fill="none" stroke="#a8bba7" stroke-width=".52"/>
<rect x="12.5" y="12.5" width="185" height="272" rx="1" fill="none" stroke="#d9e4d4" stroke-width=".35"/>
<path d="M0 40C9 31 15 18 24 0M0 58C8 44 15 34 34 20M210 240C199 256 189 272 184 297M210 252C197 260 190 275 172 286" stroke="#7b9b81" stroke-width=".7" fill="none"/>
<circle cx="105" cy="17" r="2.1" stroke="#7e9d79" fill="none" stroke-width=".55"/>
<path d="M92 17H100M110 17H118M97 280H113" stroke="#9cb69b" stroke-width=".55" fill="none"/>'''
for args in [(12,17,-25,1,'#bbcfac'),(20,11,28,.8,'#87ad94'),(7,33,-45,1.2,'#accaaa'),(27,27,45,1.1,'#91b596'),(14,43,-44,.75,'#7fa486'),(190,275,42,1.2,'#b4d2ad'),(194,287,-15,.8,'#8aae91'),(203,258,40,1.1,'#91b596'),(176,286,-44,1.25,'#7ea58e')]:bot+=leaf(*args)
for x,y,r in [(22,27,1.6),(13,35,1),(188,276,1.4)]:
 bot+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="#e8d8ba"/>'

# 3. Graph paper: ivory engineering paper, 5-mm grid + left binder holes.
grid='''<rect x="0" y="0" width="27" height="297" fill="#f1f3fb"/>
<path d="M29 0V297" stroke="#f2a7a9" stroke-width=".55"/>'''
for x in range(0,211,5): grid+=f'<path d="M{x} 0V297" stroke="{"#cbdbea" if x%20==0 else "#e2eaf2"}" stroke-width="{".24" if x%20==0 else ".18"}"/>'
for y in range(0,298,5): grid+=f'<path d="M0 {y}H210" stroke="{"#cbdbea" if y%20==0 else "#e2eaf2"}" stroke-width="{".24" if y%20==0 else ".18"}"/>'
for y in [45,102,159,216,273]:grid+=f'<circle cx="10" cy="{y}" r="2.1" fill="#fff" stroke="#9eafc2" stroke-width=".42"/><circle cx="10" cy="{y}" r=".7" fill="#f1f4f8"/>'
grid+='''<rect x="144" y="0" width="54" height="8" rx="0" fill="#f5d8a8" opacity=".92"/><rect x="144" y="8" width="54" height=".8" fill="#deba7e"/>
<rect x="186" y="280" width="14" height="17" fill="#edf2fa" opacity=".75"/>'''

# 4. Cozy coffee: warm editorial stationery and coffee doodles.
coffee='''<rect width="210" height="16" fill="#f5e7d6"/>
<rect y="281" width="210" height="16" fill="#f5e7d6"/>
<rect x="11.5" y="11.5" width="187" height="274" rx="2" fill="none" stroke="#d1b49a" stroke-width=".5"/>
<rect x="15" y="15" width="180" height="267" rx="1" fill="none" stroke="#e8d8c5" stroke-width=".3"/>
<path d="M56 20H154M57 276H153" stroke="#d0ae8c" stroke-width=".6" stroke-linecap="round"/>
<path d="M76 20h58" stroke="#ad815e" stroke-width=".35" stroke-dasharray="2 2"/>
<g transform="translate(183 271)"><ellipse cy="11" rx="14" ry="2" fill="#dfc5ab" opacity=".75"/>
<path d="M-12 -4H8L6 8Q0 13-8 8Z" fill="#fff7ed" stroke="#92694f" stroke-width=".65"/>
<path d="M8 -2Q18-4 16 3Q14 8 7 7" fill="none" stroke="#92694f" stroke-width=".85"/>
<ellipse cx="-2" cy="-4" rx="10" ry="2.35" fill="#b98663" stroke="#916347" stroke-width=".4"/>
<path d="M-7 -9Q-10 -13 -6 -16M-1 -9Q2 -14-1 -17M5 -9Q8 -13 6 -17" stroke="#b8a08b" stroke-width=".65" fill="none" stroke-linecap="round"/>
<path d="M-4 1Q0 -2 2 1Q0 4 -4 1Z" fill="#d6a07e"/></g>'''
for args in [(20,24,30,1.0),(30,16,-18,.82),(16,277,-36,.7),(31,276,45,.75),(202,27,-36,.5)]:coffee+=bean(*args)
coffee+='''<circle cx="104" cy="16" r="1.6" fill="#c8a17f"/>
<g fill="#d4ae89" opacity=".85"><circle cx="50" cy="9" r=".8"/><circle cx="155" cy="9" r=".8"/><circle cx="41" cy="287" r=".8"/></g>'''

# 5. Starry letter: stylish navy upper/lower band + ivory readable interior.
night='''<rect width="210" height="22" fill="#27334e"/>
<rect y="277" width="210" height="20" fill="#27334e"/>
<path d="M0 22H210M0 277H210" stroke="#d7bd81" stroke-width=".7"/>
<path d="M13 28L13 269M197 28V269" stroke="#d9e0e9" stroke-width=".38"/>
<path d="M78 11H132M78 285H132" stroke="#bfae84" stroke-width=".45" opacity=".65"/>
<circle cx="22" cy="11" r="6.0" fill="#f0d89c"/>
<circle cx="25" cy="9" r="6.0" fill="#27334e"/>
<path d="M161 10L170 6L182 12L194 7M12 286L25 284L38 291L49 284" stroke="#98adcb" fill="none" stroke-width=".45"/>
<g fill="#f9f0cf"><circle cx="161" cy="10" r=".8"/><circle cx="170" cy="6" r=".8"/><circle cx="182" cy="12" r=".8"/><circle cx="194" cy="7" r=".8"/><circle cx="12" cy="286" r=".8"/><circle cx="25" cy="284" r=".8"/><circle cx="38" cy="291" r=".8"/><circle cx="49" cy="284" r=".8"/></g>
<path d="M25 38L37 34L44 43L59 37M165 254L177 261L192 250" stroke="#b7c8d4" stroke-width=".45" fill="none" opacity=".75"/>
<circle cx="25" cy="38" r=".8" fill="#d4b778"/><circle cx="37" cy="34" r=".75" fill="#d4b778"/><circle cx="44" cy="43" r=".8" fill="#d4b778"/><circle cx="192" cy="250" r=".8" fill="#d4b778"/>'''
for x,y,r in [(60,9,1.2),(75,17,.8),(104,7,1.3),(138,13,1),(149,5,.7),(204,18,.85),(176,287,1.5),(117,287,1),(92,282,.8),(62,291,1.2),(196,282,1.1)]:night+=star(x,y,r)
for x,y in [(156,29),(18,257),(194,76),(28,245)]:night+=star(x,y,.85,'#d9c18e')

# 6. Contemporary geometric: clean minimal shapes in pastel edge corners.
geo='''<path d="M0 0H96L58 18L0 35Z" fill="#dceef8"/>
<path d="M0 0H50L0 55Z" fill="#c6e7df"/>
<circle cx="198" cy="9" r="25" fill="#fde7c7"/>
<circle cx="199" cy="11" r="14" fill="#f7d4da"/>
<path d="M210 253V297H152Z" fill="#dce6f8"/>
<path d="M210 281V297H182Z" fill="#bfdcd5"/>
<circle cx="13" cy="283" r="24" fill="#f6e3ed"/>
<circle cx="13" cy="283" r="12" fill="#dce8f7"/>
<path d="M0 54L14 43L27 57L42 43" stroke="#b4baca" stroke-width=".75" fill="none"/>
<path d="M167 26L182 40L200 28" stroke="#f0babe" stroke-width=".9" fill="none"/>
<path d="M39 276H170" stroke="#dfdfe7" stroke-width=".6" stroke-dasharray="3 2"/>
<path d="M42 19H166" stroke="#dfdfe7" stroke-width=".6" stroke-dasharray="3 2"/>
<rect x="16" y="75" width="1.2" height="140" fill="#e7ebef"/>
<rect x="193" y="75" width="1.2" height="140" fill="#e7ebef"/>'''
for x,y,r,c in [(34,32,2,'#8fc7c2'),(185,57,2.6,'#eab0bf'),(174,17,1.4,'#efc082'),(41,285,1.8,'#b1c6ee'),(179,266,1.8,'#93c9ba')]:geo+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'

styles={
 'sakura': ('Sakura blossom',svg(sak,'#fffafb')),
 'botanical': ('Sage botanical',svg(bot,'#fbfdf8')),
 'grid': ('Graph notebook',svg(grid,'#fcfdff')),
 'coffee': ('Cozy coffee',svg(coffee,'#fffaf3')),
 'night': ('Moonlit stars',svg(night,'#fdfcf9')),
 'geometric': ('Pastel geometric',svg(geo,'#fffefe')),
}

# Gallery cards show actual page artwork with a short realistic writing sample.
font_candidates=['/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf','/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf']
font_bold_candidates=['/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf','/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf']
font_file=next((p for p in font_candidates if Path(p).exists()),None)
bold_file=next((p for p in font_bold_candidates if Path(p).exists()),font_file)
font_title=ImageFont.truetype(bold_file,24)
font_h2=ImageFont.truetype(bold_file,13)
font_body=ImageFont.truetype(font_file,11)

new_previews={}
new_art={}
for id,(name,graphic) in styles.items():
 (artdir/f'{id}.svg').write_text(graphic,encoding='utf8')
 # Rasterizing only thumbnails; PDF uses original SVG vectors.
 png=cairosvg.svg2png(bytestring=graphic.encode(),output_width=360,output_height=509)
 page=Image.open(io.BytesIO(png)).convert('RGB')
 draw=ImageDraw.Draw(page)
 # scale based on 360 px / 210 mm
 lm=60 if id=='grid' else 40
 y=58 if id in ('sakura','botanical','coffee','night','geometric') else 39
 draw.text((lm,y), 'Dear friend',font=font_title, fill='#403b3c')
 y+=40
 draw.line((lm,y,lm+250,y),fill='#ded6d6',width=1)
 y+=24
 paragraph=['Every page begins a new story.', 'A quiet place for your thoughts,', 'small discoveries, and the moments', 'you want to keep forever.']
 for line in paragraph:
  draw.text((lm,y),line,font=font_body,fill='#555255');y+=21
 y+=27
 draw.text((lm,y),'Little things, beautifully written',font=font_h2,fill='#4b4848')
 y+=35
 for line in ['Write about today, and the places','you hope to explore tomorrow.','', 'Make space for something wonderful.']:
  draw.text((lm,y),line,font=font_body,fill='#555255');y+=20
 page.save(previews/f'{id}.webp','WEBP',quality=88,method=6)
 new_previews[id]=f'assets/stationery/previews/{id}.webp'
 new_art[id]=graphic

js='''/* Extra original A4 vector stationery themes. Gallery images are project-local.\n   Kept separate so existing styles and multi-page pagination remain unchanged. */\n'''
js+='Object.assign(stationeryPreviewPhotos, '+json.dumps(new_previews,separators=(',',':'))+');\n'
js+='Object.assign(stationeryArt, '+json.dumps(new_art,separators=(',',':'),ensure_ascii=False)+');\n'
(root/'js/stationery-extra.js').write_text(js,encoding='utf8')
print('Built',', '.join(styles))
