#!/usr/bin/env python3
# Pflege-Faktencheck -- runder QR-Aufkleber (45mm), vollstaendig als Rasterbild erzeugt.
#
# Rene-Fund (2026-11-15): SVG <textPath> rendert je nach Betrachter/Font-Fallback nicht
# konsistent gebogen -- beim Debuggen stand der untere Textbogen sogar kopfueber (falsche
# Rotationsformel fuer die untere Kreishaelfte, s. draw_circular_text()). Fix: jeder
# Buchstabe wird hier einzeln per PIL exakt auf den Kreisbogen rotiert und als fertiges
# PNG zusammengesetzt -- render-unabhaengig, in jedem PDF-Betrachter/Druckweg identisch.
#
# QR-Code: ERROR_CORRECT_H (30% Fehlerkorrektur-Toleranz), damit das Logo-Badge in der
# Mitte (30% der QR-Breite) eingebettet werden kann, ohne die Scanbarkeit zu zerstoeren --
# nach dem Einbetten per OpenCV real gegengetestet, nicht nur angenommen.
#
# Farbwerte/Logo-Kurven 1:1 aus index.html uebernommen (GLOBAL_SOURCE_OF_TRUTH_MANDATE).
from PIL import Image, ImageDraw, ImageFont
import qrcode
from qrcode.constants import ERROR_CORRECT_H
import math
import numpy as np
import cv2
import os

OUT = os.path.dirname(os.path.abspath(__file__))
SIZE = 2048
CX = CY = SIZE / 2
SCALE = SIZE / 45.0  # mm -> px
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
URL = "https://pflege-faktencheck.de/"


def build_logo_qr():
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_H, box_size=20, border=2)
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#131B27", back_color="white").convert("RGBA")
    w, h = img.size

    badge_d = int(w * 0.30)
    badge = Image.new("RGBA", (badge_d, badge_d), (0, 0, 0, 0))
    d = ImageDraw.Draw(badge)
    d.ellipse([0, 0, badge_d - 1, badge_d - 1], fill="white")
    pad = int(badge_d * 0.14)
    inner = badge_d - 2 * pad
    d.ellipse([pad, pad, pad + inner, pad + inner], fill="#131B27")

    colors = [(0x6B, 0x44, 0x23), (0xB8, 0x73, 0x33), (0xE8, 0xC3, 0x9E)]
    arr = np.zeros((inner, inner, 4), dtype=np.uint8)
    for y in range(inner):
        for x in range(inner):
            t = (x + y) / (2 * inner)
            if t < 0.5:
                c = [int(colors[0][i] + (colors[1][i] - colors[0][i]) * (t / 0.5)) for i in range(3)]
            else:
                c = [int(colors[1][i] + (colors[2][i] - colors[1][i]) * ((t - 0.5) / 0.5)) for i in range(3)]
            arr[y, x] = c + [255]
    grad = Image.fromarray(arr, "RGBA")

    mask = Image.new("L", (inner, inner), 0)
    md = ImageDraw.Draw(mask)
    sw = max(3, int(inner * 0.07))

    def heart_points(n=200):
        pts = []
        for i in range(n + 1):
            tt = i / n * 2 * math.pi
            x = 16 * math.sin(tt) ** 3
            y = -(13 * math.cos(tt) - 5 * math.cos(2 * tt) - 2 * math.cos(3 * tt) - math.cos(4 * tt))
            pts.append((50 + x * 2.1, 50 + y * 2.0 - 6))
        return pts

    pts = [((px / 100.0) * inner, (py / 100.0) * inner) for px, py in heart_points()]
    md.line(pts, fill=255, width=sw, joint="curve")
    check = [(36, 52), (45, 61), (66, 38)]
    check_scaled = [((px / 100.0) * inner, (py / 100.0) * inner) for px, py in check]
    md.line(check_scaled, fill=255, width=int(sw * 1.2), joint="curve")

    heart_layer = Image.new("RGBA", (inner, inner), (0, 0, 0, 0))
    heart_layer.paste(grad, (0, 0), mask)
    badge.alpha_composite(heart_layer, (pad, pad))
    img.alpha_composite(badge, ((w - badge_d) // 2, (h - badge_d) // 2))

    # Scan-Test NACH Logo-Einbettung -- kein Blindvertrauen in die 30%-Faustregel.
    check_img = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(check_img)
    assert data == URL, f"QR mit Logo nicht scannbar! Dekodiert: {data!r}"
    return img


def draw_circular_text(base, text, radius_mm, font_path, font_size_mm, color, start_deg, end_deg, flip=False):
    # flip=True fuer Text auf der UNTEREN Kreishaelfte -- ohne den +180-Grad-Ausgleich und
    # die umgekehrte Zeichenreihenfolge steht der Text kopfueber (echter Fund, s. Kommentar oben).
    font = ImageFont.truetype(font_path, int(font_size_mm * SCALE))
    seq = text[::-1] if flip else text
    widths = []
    for ch in seq:
        bbox = font.getbbox(ch)
        widths.append(bbox[2] - bbox[0] if ch != " " else font_size_mm * SCALE * 0.3)
    r_px = radius_mm * SCALE
    total_angle = math.degrees(sum(widths) / r_px)
    center_angle = (start_deg + end_deg) / 2
    cur = center_angle - total_angle / 2
    for ch, w in zip(seq, widths):
        half_w_deg = math.degrees((w / 2) / r_px)
        char_angle = cur + half_w_deg
        rad = math.radians(char_angle - 90)
        x = CX + r_px * math.cos(rad)
        y = CY + r_px * math.sin(rad)
        pad = int(font_size_mm * SCALE * 1.6)
        glyph = Image.new("RGBA", (pad, pad), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glyph)
        gd.text((pad / 2, pad / 2), ch, font=font, fill=color, anchor="mm")
        rot_angle = -(char_angle) + (180 if flip else 0)
        rot = glyph.rotate(rot_angle, resample=Image.BICUBIC, expand=False)
        base.alpha_composite(rot, (int(x - pad / 2), int(y - pad / 2)))
        cur += 2 * half_w_deg


def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    dist = np.sqrt((xx - CX) ** 2 + (yy - CY) ** 2)

    outer_r, inner_r = 22.5 * SCALE, 21.9 * SCALE
    t = np.clip((xx + yy) / (2 * SIZE), 0, 1)
    bronze = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    stops = [(0.0, (0x6B, 0x44, 0x23)), (0.5, (0xB8, 0x73, 0x33)), (1.0, (0xE8, 0xC3, 0x9E))]
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        seg = (t >= t0) & (t <= t1)
        f = np.clip((t - t0) / (t1 - t0 + 1e-9), 0, 1)
        for ch in range(3):
            bronze[..., ch] = np.where(seg, c0[ch] + (c1[ch] - c0[ch]) * f, bronze[..., ch])
    arr = np.zeros((SIZE, SIZE, 4), dtype=np.uint8)
    arr[..., :3] = bronze.astype(np.uint8)
    arr[..., 3] = np.where(dist <= outer_r, 255, 0)
    img = Image.fromarray(arr, "RGBA")

    navy = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    center_c, edge_c = np.array([0x30, 0x3F, 0x58]), np.array([0x13, 0x1B, 0x27])
    d2 = np.clip(np.sqrt((xx - CX) ** 2 + (yy - (CY - 0.3 * outer_r)) ** 2) / (outer_r * 1.1), 0, 1)
    for ch in range(3):
        navy[..., ch] = center_c[ch] + (edge_c[ch] - center_c[ch]) * d2
    inner_arr = np.zeros((SIZE, SIZE, 4), dtype=np.uint8)
    inner_arr[..., :3] = navy.astype(np.uint8)
    inner_arr[..., 3] = np.where(dist <= inner_r, 255, 0)
    img.alpha_composite(Image.fromarray(inner_arr, "RGBA"))

    qr = build_logo_qr()
    qr_size = int(19 * SCALE)  # René-Korrektur 2026-11-15: war 23mm, zu dominant/zu nah an den Textboegen
    qr_resized = qr.resize((qr_size, qr_size), Image.LANCZOS)
    qr_bg = Image.new("RGBA", (qr_size + int(2 * SCALE), qr_size + int(2 * SCALE)), (0, 0, 0, 0))
    qd = ImageDraw.Draw(qr_bg)
    qd.rounded_rectangle([0, 0, qr_bg.width - 1, qr_bg.height - 1], radius=int(2 * SCALE), fill="white")
    qr_bg.alpha_composite(qr_resized, (int(1 * SCALE), int(1 * SCALE)))
    img.alpha_composite(qr_bg, (int(CX - qr_bg.width / 2), int(CY - qr_bg.height / 2)))

    draw_circular_text(img, "PFLEGE-FAKTENCHECK", 18, FONT_BOLD, 3.6, (231, 226, 214, 255), -83, 83, flip=False)
    draw_circular_text(img, "pflege-faktencheck.de", 18, FONT_BOLD, 2.6, (232, 195, 158, 255), 98, 262, flip=True)

    out_path = os.path.join(OUT, "sticker-rund-final.png")
    img.save(out_path)

    # Eckpixel-Probe: Alpha muss 0 sein (kein Quadrat-Rahmen-Leck, s. frueherer border-image-Bug).
    w, h = img.size
    for x, y in [(5, 5), (w - 5, 5), (5, h - 5), (w - 5, h - 5)]:
        assert img.getpixel((x, y))[3] == 0, "Eckpixel nicht transparent -- Quadrat-Leck!"
    print("Fertig:", out_path)


if __name__ == "__main__":
    main()
