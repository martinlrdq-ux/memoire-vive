#!/usr/bin/env python3
"""Scènes du widget Kikory : le hibou en pied, mis en scène selon le moment de la journée.
Écrit widget/scenes/<scène>.png (680 × 680, petit et grand widget) et <scène>-wide.png
(1440 × 680, widget moyen), téléchargées par le widget Scriptable.
    python3 tools/make_widget_scenes.py
Le rendu SVG → PNG passe par Google Chrome (headless).
"""
import pathlib, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'widget' / 'scenes'
OUT.mkdir(parents=True, exist_ok=True)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

BROWN, DARK, CREAM, BELLY, ORANGE, INK = '#854F0B', '#633806', '#FAEEDA', '#F3D7A8', '#EF9F27', '#412402'


def eyes(kind):
    s = ''
    for side in (-1, 1):
        cx, cy = 17 * side, -80
        s += f'<circle cx="{cx}" cy="{cy}" r="17" fill="{CREAM}"/>'
        if kind in ('open', 'down', 'wide', 'worried'):
            r = 10 if kind == 'wide' else 8
            dy = 4 if kind == 'down' else (2 if kind == 'worried' else 0)
            dx = -2 * side if kind == 'down' else 0
            s += f'<circle cx="{cx + dx}" cy="{cy + dy}" r="{r}" fill="{INK}"/>'
            s += f'<circle cx="{cx + dx + 3}" cy="{cy + dy - 3}" r="{3 if kind == "wide" else 2.4}" fill="#fff"/>'
        if kind == 'sleepy':
            s += f'<circle cx="{cx}" cy="{cy + 4}" r="7" fill="{INK}"/>'
            s += f'<path d="M{cx - 17} {cy + 1} A17 17 0 0 1 {cx + 17} {cy + 1} Z" fill="#9C5F14"/>'
            s += f'<path d="M{cx - 15} {cy + 1} H{cx + 15}" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>'
        if kind == 'happy':
            s += f'<path d="M{cx - 9} {cy + 4} Q{cx} {cy - 8} {cx + 9} {cy + 4}" stroke="{INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
        if kind == 'worried':
            s += f'<path d="M{cx - 14 * side} {cy - 24} L{cx + 10 * side} {cy - 18}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    return s


def wing(side, pose):
    x = 40 * side
    if pose == 'down':
        return f'<ellipse cx="{x}" cy="-48" rx="12" ry="28" fill="{DARK}" transform="rotate({-12 * side} {x} -48)"/>'
    if pose == 'up':
        return f'<ellipse cx="{48 * side}" cy="-92" rx="11" ry="30" fill="{DARK}" transform="rotate({35 * side} {48 * side} -92)"/>'
    if pose == 'hold':
        return f'<ellipse cx="{24 * side}" cy="-42" rx="11" ry="24" fill="{DARK}" transform="rotate({-55 * side} {24 * side} -42)"/>'
    if pose == 'point':
        return f'<ellipse cx="{56 * side}" cy="-70" rx="10" ry="28" fill="{DARK}" transform="rotate({60 * side} {56 * side} -70)"/>'
    return ''


def owl(x, y, s=1.0, eye='open', left='down', right='down', front='', hat='', blush=True):
    """Hibou en pied : origine aux pieds, ~130 unités de haut à l'échelle 1."""
    back = ''.join(wing(sd, p) for sd, p in ((-1, left), (1, right)) if p in ('down', 'up', 'point'))
    fore = ''.join(wing(sd, p) for sd, p in ((-1, left), (1, right)) if p == 'hold')
    chevrons = ''.join(
        f'<path d="M{cx - 5} {cy} L{cx} {cy + 5} L{cx + 5} {cy}" stroke="#D9A066" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
        for cx, cy in ((-10, -46), (10, -46), (0, -34), (-12, -24), (12, -24)))
    cheeks = ''.join(f'<ellipse cx="{30 * sd}" cy="-64" rx="6" ry="4" fill="#F0997B" opacity=".55"/>' for sd in (-1, 1)) if blush else ''
    return f'''<g transform="translate({x} {y}) scale({s})">
<ellipse cx="0" cy="2" rx="40" ry="6" fill="#000" opacity=".12"/>
<ellipse cx="-15" cy="-3" rx="10" ry="6" fill="{ORANGE}"/><ellipse cx="15" cy="-3" rx="10" ry="6" fill="{ORANGE}"/>
{back}
<polygon points="-40,-88 -34,-124 -14,-104" fill="{BROWN}"/><polygon points="40,-88 34,-124 14,-104" fill="{BROWN}"/>
<ellipse cx="0" cy="-58" rx="45" ry="56" fill="{BROWN}"/>
<ellipse cx="0" cy="-34" rx="28" ry="28" fill="{BELLY}"/>{chevrons}
{eyes(eye)}{cheeks}
<polygon points="-6,-68 6,-68 0,-58" fill="{ORANGE}"/>
{hat}{front}{fore}
</g>'''


def card(bg, body, floor=()):
    """floor : bandes (y, hauteur, couleur) du sol, prolongées sur toute la largeur dans la version large."""
    return {'bg': bg, 'body': body, 'floor': floor}


def svg(c, wide=False):
    """Carrée (petit et grand widget) ou large (widget moyen : la scène à droite, le texte à gauche)."""
    w, dx = (720, 380) if wide else (340, 0)
    # Le sol prolongé à gauche passe par-dessus le bord arrondi de la table de la scène.
    floor = ''.join(f'<rect x="0" y="{y}" width="{dx + 4}" height="{hh}" fill="{col}"/>' for y, hh, col in c['floor']) if wide else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 340" width="{w}" height="340">
<defs><clipPath id="c"><rect width="{w}" height="340"/></clipPath></defs>
<g clip-path="url(#c)"><rect width="{w}" height="340" fill="{c['bg']}"/><g transform="translate({dx} 0)">{c['body']}</g>{floor}</g></svg>'''


# --- Matin : retour de veille, café et bonnet de nuit ------------------------
nightcap = '''<path d="M-36 -110 Q-6 -168 46 -150 Q60 -144 58 -128 Q40 -140 30 -118 Z" fill="#6C8EF5"/>
<path d="M-12 -138 Q10 -150 34 -146" stroke="#fff" stroke-width="5" fill="none" opacity=".7"/>
<rect x="-40" y="-122" width="76" height="16" rx="8" fill="#fff" transform="rotate(-6 0 -114)"/>
<circle cx="58" cy="-126" r="10" fill="#fff"/>'''
mug = '''<rect x="-20" y="-58" width="40" height="40" rx="7" fill="#E24B4A"/>
<path d="M20 -50 q14 0 14 12 q0 12 -14 12" stroke="#E24B4A" stroke-width="6" fill="none"/>
<path d="M-10 -40 q4 -6 0 -10 q-4 -6 0 -10" stroke="#fff" stroke-width="3" fill="none" opacity=".9"/>'''
steam = '''<g stroke="#D9A066" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8">
<path d="M228 214 q-8 -10 0 -20 q8 -10 0 -20"/><path d="M244 216 q-8 -10 0 -20 q8 -10 0 -20"/></g>'''
matin = card('#FFF0D4', f'''
<rect x="226" y="22" width="92" height="88" rx="12" fill="#CDE7FF" stroke="#E8C48A" stroke-width="7"/>
<clipPath id="w1"><rect x="230" y="26" width="84" height="80" rx="8"/></clipPath>
<g clip-path="url(#w1)"><circle cx="272" cy="104" r="26" fill="#FFB627"/><circle cx="272" cy="104" r="38" fill="#FFB627" opacity=".25"/>
<ellipse cx="248" cy="48" rx="14" ry="6" fill="#fff"/><ellipse cx="260" cy="44" rx="10" ry="7" fill="#fff"/></g>
<path d="M272 26 V106 M230 66 H314" stroke="#E8C48A" stroke-width="5"/>
<path d="M218 16 Q232 66 218 120 L208 120 L208 16 Z" fill="#F5A3A3"/><path d="M326 16 Q312 66 326 120 L336 120 L336 16 Z" fill="#F5A3A3"/>
<rect x="200" y="10" width="140" height="8" rx="4" fill="#C98B4F"/>
{owl(150, 300, 1.0, eye='sleepy', left='down', right='down', hat=nightcap)}
<g transform="translate(236 280)">{mug}</g>{steam}
<g fill="none" stroke="#BA7517" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M190 132 h10 l-10 12 h10"/><path d="M206 112 h7 l-7 9 h7"/></g>
<rect x="-10" y="284" width="360" height="70" fill="#C98B4F"/><rect x="-10" y="278" width="360" height="14" rx="5" fill="#DDA266"/>
<g transform="translate(300 252)"><circle r="24" fill="#5DCAA5"/><circle r="18" fill="#fff"/>
<path d="M0 0 V-12 M0 0 L8 4" stroke="#412402" stroke-width="3" stroke-linecap="round"/>
<circle cx="-18" cy="-20" r="7" fill="#5DCAA5"/><circle cx="18" cy="-20" r="7" fill="#5DCAA5"/>
<path d="M-14 22 l-5 9 M14 22 l5 9" stroke="#0F6E56" stroke-width="4" stroke-linecap="round"/></g>
<g transform="translate(46 262)"><ellipse cx="0" cy="18" rx="30" ry="6" fill="#fff"/>
<path d="M-24 14 Q-26 -6 -6 -4 Q0 -14 8 -4 Q26 -6 24 14 Z" fill="#EF9F27"/>
<path d="M-12 12 Q-12 0 -4 -2 M10 12 Q10 0 2 -2" stroke="#BA7517" stroke-width="2.5" fill="none"/></g>''', floor=[(284, 60, '#C98B4F'), (278, 14, '#DDA266')])

# --- Journée : au bureau, les post-it de la mission --------------------------
glasses = '''<g stroke="#2C2C2A" stroke-width="3.5" fill="none"><circle cx="-17" cy="-80" r="19"/><circle cx="17" cy="-80" r="19"/><path d="M-2 -82 Q0 -86 2 -82"/></g>'''
check = 'stroke="#2E9E5B" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"'
journee = card('#DCEBFF', f'''
<rect x="200" y="24" width="118" height="96" rx="10" fill="#E2A868" stroke="#B07A43" stroke-width="6"/>
<g transform="rotate(-5 222 66)"><rect x="210" y="46" width="28" height="28" fill="#FFE066"/><path d="M216 60 l6 6 l10 -12" {check}/></g>
<g transform="rotate(4 259 66)"><rect x="245" y="48" width="28" height="28" fill="#FFADC6"/><path d="M251 62 l6 6 l10 -12" {check}/></g>
<g transform="rotate(-3 296 66)"><rect x="281" y="46" width="28" height="28" fill="#A8E6CF"/><path d="M288 56 h14 M288 63 h10" stroke="#0F6E56" stroke-width="2.5" stroke-linecap="round"/></g>
<circle cx="224" cy="48" r="4" fill="#E24B4A"/><circle cx="259" cy="50" r="4" fill="#378ADD"/><circle cx="295" cy="48" r="4" fill="#E24B4A"/>
<rect x="214" y="86" width="40" height="22" fill="#fff" transform="rotate(3 234 97)"/><path d="M220 94 h26 M220 100 h18" stroke="#B4B2A9" stroke-width="2.5" transform="rotate(3 234 97)"/>
<rect x="262" y="84" width="44" height="26" fill="#FFE066" transform="rotate(-4 284 97)"/>
<g transform="translate(48 280)"><path d="M0 0 L-14 -54 L18 -84" stroke="#5F5E5A" stroke-width="6" fill="none" stroke-linecap="round"/>
<path d="M6 -100 L44 -82 L24 -64 Z" fill="#FF7A59"/><path d="M24 -64 L120 0 L60 0 Z" fill="#FFE9A6" opacity=".45"/>
<rect x="-18" y="-6" width="36" height="8" rx="4" fill="#5F5E5A"/></g>
{owl(162, 296, 1.0, eye='down', left='down', right='down', hat=glasses)}
<rect x="-10" y="284" width="360" height="70" fill="#B98552"/><rect x="-10" y="278" width="360" height="14" rx="5" fill="#CF9A63"/>
<path d="M118 284 L124 248 Q125 244 130 244 L194 244 Q199 244 200 248 L206 284 Z" fill="#9AA7B8"/>
<rect x="106" y="279" width="112" height="8" rx="4" fill="#7E8A9A"/>
<g transform="translate(162 276) scale(.16)"><polygon points="-40,-88 -34,-124 -14,-104" fill="#fff"/><polygon points="40,-88 34,-124 14,-104" fill="#fff"/><ellipse cx="0" cy="-58" rx="45" ry="56" fill="#fff"/></g>
<g transform="translate(286 280)"><path d="M-6 -46 L-12 -78 M4 -46 L8 -80 M12 -46 L22 -72" stroke-width="5" stroke-linecap="round" stroke="#378ADD"/>
<path d="M4 -46 L8 -80" stroke="#EF9F27" stroke-width="5" stroke-linecap="round"/>
<rect x="-18" y="-48" width="38" height="48" rx="6" fill="#5DCAA5"/></g>''', floor=[(284, 60, '#B98552'), (278, 14, '#CF9A63')])

# --- Soir : le réveil qui sonne, la série en jeu ------------------------------
sweat = '<path d="M50 -116 q-8 12 0 16 q8 -4 0 -16 Z" fill="#7CC4F5"/>'
soir = card('#FFE1D2', f'''
<rect x="-10" y="296" width="360" height="60" fill="#F2B9A0"/><ellipse cx="200" cy="300" rx="150" ry="10" fill="#E9A88C"/>
<g transform="translate(248 214) rotate(8)">
<path d="M-44 52 l-12 22 M44 52 l12 22" stroke="#A32D2D" stroke-width="8" stroke-linecap="round"/>
<circle cx="-42" cy="-56" r="20" fill="#FFB020"/><circle cx="42" cy="-56" r="20" fill="#FFB020"/>
<path d="M0 -68 V-84 M-14 -84 H14" stroke="#A32D2D" stroke-width="7" stroke-linecap="round"/>
<circle r="66" fill="#E24B4A"/><circle r="52" fill="#FFF8F0"/>
<g stroke="#412402" stroke-width="4" stroke-linecap="round"><path d="M0 -44 v8 M44 0 h-8 M0 44 v-8 M-44 0 h8"/></g>
<path d="M0 0 L-28 0 M0 0 L0 -36" stroke="#412402" stroke-width="6" stroke-linecap="round"/><circle r="5" fill="#412402"/></g>
<g stroke="#D85A30" stroke-width="5" stroke-linecap="round"><path d="M190 176 l-14 -4 M318 136 l14 -8 M310 118 l10 -14"/></g>
{owl(104, 304, 1.12, eye='worried', left='down', right='point', hat=sweat)}''', floor=[(296, 60, '#F2B9A0')])

# --- Mission faite : podium, médaille et confettis ----------------------------
medal = '''<path d="M-20 -60 L0 -40 L20 -60" stroke="#378ADD" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="0" cy="-30" r="15" fill="#FFC83D" stroke="#BA7517" stroke-width="3"/>
<path d="M0 -39 l3 6 l6 1 l-4.5 4 l1 6 l-5.5 -3 l-5.5 3 l1 -6 l-4.5 -4 l6 -1 Z" fill="#BA7517"/>'''
confetti = ''.join(
    f'<rect x="{x}" y="{y}" width="{w}" height="7" rx="2" fill="{c}" transform="rotate({r} {x} {y})"/>'
    for x, y, w, c, r in (
        (210, 40, 16, '#E24B4A', 20), (250, 70, 12, '#378ADD', -30), (290, 34, 14, '#EF9F27', 50), (318, 92, 12, '#D4537E', 10),
        (230, 110, 10, '#5DCAA5', -40), (280, 128, 14, '#7F77DD', 30), (60, 150, 12, '#EF9F27', -20), (36, 200, 14, '#D4537E', 40),
        (300, 180, 12, '#E24B4A', -15), (100, 130, 10, '#378ADD', 60), (320, 230, 12, '#5DCAA5', 25), (24, 250, 10, '#7F77DD', -35)))
victoire = card('#DFF3CF', f'''
{confetti}
<rect x="-10" y="312" width="360" height="40" fill="#B6DE8F"/>
<rect x="104" y="262" width="132" height="60" rx="6" fill="#fff"/><rect x="98" y="254" width="144" height="14" rx="5" fill="#97C459"/>
<path d="M162 284 L172 278 V310" stroke="#3B6D11" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="34" y="282" width="70" height="40" rx="6" fill="#fff" opacity=".7"/><rect x="236" y="290" width="70" height="32" rx="6" fill="#fff" opacity=".7"/>
{owl(170, 258, 1.08, eye='happy', left='up', right='up', hat=medal)}
<g fill="#FFC83D"><path d="M84 200 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 Z"/><path d="M262 214 l3 7 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1 Z"/></g>''', floor=[(312, 40, '#B6DE8F')])

# --- Nuit : le hibou veille sur les bocaux de souvenirs -----------------------
book = '''<path d="M-44 -60 Q-20 -66 0 -58 Q20 -66 44 -60 L44 -20 Q20 -28 0 -18 Q-20 -28 -44 -20 Z" fill="#D85A30"/>
<path d="M-38 -56 Q-18 -64 0 -54 L0 -24 Q-18 -32 -38 -26 Z" fill="#FFF8F0"/>
<path d="M38 -56 Q18 -64 0 -54 L0 -24 Q18 -32 38 -26 Z" fill="#F1E6D6"/>
<path d="M-30 -48 q12 -4 24 1 M-30 -40 q12 -4 24 1 M8 -47 q12 -5 22 -1" stroke="#B4B2A9" stroke-width="2" fill="none"/>'''
jars = ''.join(f'''<g transform="translate({x} 250)"><circle cy="-4" r="26" fill="{c}" opacity=".22"/>
<rect x="-14" y="-24" width="28" height="34" rx="9" fill="#fff" opacity=".35"/><circle cy="-4" r="8" fill="{c}"/>
<rect x="-11" y="-30" width="22" height="7" rx="3" fill="#C98B4F"/></g>''' for x, c in ((248, '#FFD66B'), (286, '#9FE1CB'), (322, '#F4C0D1')))
stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FAEEDA"/>' for x, y, r in ((232, 46, 2), (300, 104, 2.5), (244, 98, 1.8), (304, 40, 1.6)))
nuit = card('#272063', f'''
<rect x="214" y="26" width="102" height="100" rx="12" fill="#151140" stroke="#4A41A8" stroke-width="7"/>
{stars}<circle cx="276" cy="66" r="20" fill="#FAC775"/><circle cx="286" cy="58" r="18" fill="#151140"/>
<path d="M265 30 V122 M218 76 H312" stroke="#4A41A8" stroke-width="5"/>
<rect x="-10" y="300" width="360" height="60" fill="#1D184C"/><ellipse cx="130" cy="312" rx="110" ry="14" fill="#3C3489"/>
<rect x="230" y="262" width="110" height="10" rx="4" fill="#8E5A2A"/><path d="M240 272 V306 M330 272 V306" stroke="#8E5A2A" stroke-width="8"/>
{jars}
<rect x="40" y="172" width="170" height="132" rx="40" fill="#7F77DD"/>
{owl(124, 292, 1.05, eye='wide', left='hold', right='hold', front=book)}
<rect x="22" y="230" width="44" height="80" rx="20" fill="#9D96E8"/><rect x="182" y="230" width="44" height="80" rx="20" fill="#9D96E8"/>
<rect x="40" y="280" width="170" height="30" rx="12" fill="#6A61D0"/>''', floor=[(300, 60, '#1D184C')])

scenes = {'matin': matin, 'journee': journee, 'soir': soir, 'victoire': victoire, 'nuit': nuit}
with tempfile.TemporaryDirectory() as tmp:
    for name, c in scenes.items():
        for suffix, wide in (('', False), ('-wide', True)):
            f = pathlib.Path(tmp) / f'{name}{suffix}.svg'
            f.write_text(svg(c, wide))
            subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
                            f'--window-size={720 if wide else 340},340', f'--screenshot={OUT / f"{name}{suffix}.png"}', f.as_uri()],
                           check=True, capture_output=True)
print('widget/scenes :', ', '.join(f'{n}.png + {n}-wide.png' for n in scenes))
