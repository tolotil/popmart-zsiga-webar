from pathlib import Path
import math
import random

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "marker-card.png"


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main() -> None:
    width, height = 1240, 1754
    image = Image.new("RGB", (width, height), "#f7f1df")
    draw = ImageDraw.Draw(image)

    font_big = load_font(62)
    font_mid = load_font(38)
    font_small = load_font(28)

    draw.rounded_rectangle(
        [70, 70, 1170, 1684],
        radius=28,
        fill="white",
        outline="#191919",
        width=12,
    )
    draw.rectangle([112, 112, 1128, 332], fill="#0e2f2f")
    draw.text((620, 205), "AR INTERACTIVE POSTER", anchor="mm", fill="white", font=font_big)
    draw.text((620, 285), "Point your phone camera here", anchor="mm", fill="#bce6d7", font=font_mid)

    draw.rectangle([140, 420, 1100, 1200], fill="#f0f5f2", outline="#191919", width=6)
    draw.ellipse([68, 318, 332, 582], fill="#e84d3d")
    draw.ellipse([820, 438, 1010, 628], fill="#ffc857")
    draw.ellipse([380, 600, 805, 1025], fill="#1f8a70")

    mountain = [
        (120, 1040),
        (270, 840),
        (395, 1015),
        (555, 760),
        (710, 1010),
        (840, 845),
        (1015, 1040),
    ]
    draw.line(mountain, fill="#191919", width=14, joint="curve")

    wave = []
    for i in range(0, 760, 20):
        x = 210 + i
        y = 1055 - 90 * math.sin(i / 95) - 50 * math.sin(i / 37)
        wave.append((x, y))
    draw.line(wave, fill="#2e4057", width=28, joint="curve")

    blocks = [
        (185, 475, 64),
        (275, 475, 36),
        (330, 518, 72),
        (950, 1045, 82),
        (845, 1072, 44),
        (910, 985, 36),
        (205, 1114, 44),
        (290, 1080, 82),
        (995, 492, 54),
        (897, 477, 34),
        (515, 500, 45),
        (605, 1110, 55),
    ]
    for x, y, size in blocks:
        draw.rectangle([x, y, x + size, y + size], fill="#191919")

    random.seed(26)
    colors = ["#191919", "#e84d3d", "#1f8a70", "#ffc857", "#2e4057"]
    for _ in range(160):
        x = random.randint(165, 1060)
        y = random.randint(445, 1160)
        size = random.randint(7, 20)
        color = random.choice(colors)
        if random.random() < 0.55:
            draw.rectangle([x, y, x + size, y + size], fill=color)
        else:
            draw.ellipse([x, y, x + size, y + size], fill=color)

    draw.text((140, 1295), "Scan. Recognize. Wake the brand.", fill="#191919", font=font_big)
    draw.text((140, 1370), "Temporary marker for the WebAR prototype.", fill="#3f4946", font=font_mid)
    draw.text((140, 1425), "Replace it later with the final campaign poster.", fill="#3f4946", font=font_mid)

    draw.rectangle([900, 1390, 1085, 1575], outline="#191919", width=10)
    fake_qr_blocks = [
        (938, 1428, 48),
        (1008, 1428, 40),
        (938, 1500, 40),
        (1008, 1500, 40),
        (980, 1478, 22),
        (1048, 1488, 20),
    ]
    for x, y, size in fake_qr_blocks:
        draw.rectangle([x, y, x + size, y + size], fill="#191919")

    draw.text((992, 1625), "MARKER", anchor="mm", fill="#191919", font=font_small)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, quality=95)
    print(OUT)


if __name__ == "__main__":
    main()
