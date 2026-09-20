#!/usr/bin/env python3
"""Cambia (o rigenera) il tema di Virtua Cycling con un solo comando.

    python3 tools/set-theme.py rosa      # Giro d'Italia (default)
    python3 tools/set-theme.py giallo    # Tour de France
    python3 tools/set-theme.py rossa     # Vuelta a España
    python3 tools/set-theme.py           # rigenera solo gli asset derivati del tema attivo

Cosa fa:
  1. theme.css   -> attiva il blocco palette scelto e commenta gli altri
  2. icon.png    <- Icon/<Tema>/icon.png
     images/screen{1,2,3}.png <- images/<Tema>/screen{1,2,3}.png
  3. asset derivati (servono alle pagine, non vanno modificati a mano):
     icon-192.png, images/screen{n}-400.webp, images/screen{n}-800.webp
  4. images/og-image.jpg (anteprima social) da tools/og-template.html,
     se trova Chrome/Chromium/Firefox; altrimenti stampa un promemoria.

Richiede solo Python 3 + Pillow (pip install pillow).
"""
import os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THEMES = {'rosa': ('Giro', 1), 'giallo': ('Tour', 2), 'rossa': ('Vuelta', 3)}
BROWSERS = [
    ('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ('chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'),
    ('firefox', '/Applications/Firefox.app/Contents/MacOS/firefox'),
]


def toggle_palette(active_index):
    """Lascia attivo solo il blocco PALETTE <active_index> in theme.css."""
    path = ROOT / 'theme.css'
    css = path.read_text()
    header = re.compile(r'/\* ═+\n\s+PALETTE (\d) — .*?═+\s*\*/', re.S)
    marks = list(header.finditer(css))
    if len(marks) != 3:
        sys.exit('theme.css: attesi 3 blocchi PALETTE, trovati %d' % len(marks))
    out = css[:marks[0].start()]
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(css)
        body = css[m.end():end].strip()
        if body.startswith('/*') and body.endswith('*/'):  # blocco oggi commentato
            body = body[2:-2].strip()
        if int(m.group(1)) != active_index:
            body = '/*\n%s\n*/' % body
        out += m.group(0) + '\n' + body + '\n\n'
    path.write_text(out.rstrip() + '\n')


def copy_theme_assets(folder):
    src_icon = ROOT / 'Icon' / folder / 'icon.png'
    if not src_icon.exists():
        sys.exit('manca %s' % src_icon.relative_to(ROOT))
    shutil.copyfile(src_icon, ROOT / 'icon.png')
    for n in (1, 2, 3):
        src = ROOT / 'images' / folder / ('screen%d.png' % n)
        if not src.exists():
            sys.exit('manca %s' % src.relative_to(ROOT))
        shutil.copyfile(src, ROOT / 'images' / ('screen%d.png' % n))


def build_derived():
    from PIL import Image
    icon = Image.open(ROOT / 'icon.png').convert('RGBA')
    icon.resize((192, 192), Image.LANCZOS).save(ROOT / 'icon-192.png', optimize=True)
    for n in (1, 2, 3):
        im = Image.open(ROOT / 'images' / ('screen%d.png' % n)).convert('RGBA')
        for w in (400, 800):
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(
                ROOT / 'images' / ('screen%d-%d.webp' % (n, w)), quality=82, method=6)


def build_og():
    from PIL import Image
    tpl = ROOT / 'tools' / 'og-template.html'
    tmp_html = ROOT / '_og.html'  # deve stare in root per i percorsi relativi
    shutil.copyfile(tpl, tmp_html)
    png = Path(tempfile.mkdtemp()) / 'og.png'
    try:
        for kind, exe in BROWSERS:
            if not os.path.exists(exe):
                continue
            if kind == 'chrome':
                cmd = [exe, '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
                       '--virtual-time-budget=6000', '--window-size=1200,630',
                       '--screenshot=%s' % png, 'file://%s' % tmp_html]
            else:
                profile = tempfile.mkdtemp()
                cmd = [exe, '--headless', '--no-remote', '--profile', profile,
                       '--screenshot', str(png), '--window-size=1200,630', 'file://%s' % tmp_html]
            subprocess.run(cmd, capture_output=True, timeout=90)
            if png.exists():
                Image.open(png).convert('RGB').save(
                    ROOT / 'images' / 'og-image.jpg', quality=88, optimize=True, progressive=True)
                return True
    finally:
        tmp_html.unlink(missing_ok=True)
    return False


def main():
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else None
    if arg:
        if arg not in THEMES:
            sys.exit('tema sconosciuto "%s": usa %s' % (arg, ' | '.join(THEMES)))
        folder, idx = THEMES[arg]
        toggle_palette(idx)
        copy_theme_assets(folder)
        print('tema %s attivato (theme.css, icon.png, images/screen*.png)' % arg)
    build_derived()
    print('asset derivati generati (icon-192.png, screen*-400/800.webp)')
    if build_og():
        print('images/og-image.jpg rigenerata')
    else:
        print('ATTENZIONE: nessun browser trovato, rigenera a mano images/og-image.jpg '
              '(vedi tools/og-template.html)')


if __name__ == '__main__':
    main()
