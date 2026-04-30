from PIL import Image, ImageDraw
import math


def create_icon(size, path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    top = (37, 126, 248)
    bottom = (15, 139, 111)
    for y in range(size):
        t = y / (size - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    radius = int(size * 0.12)
    draw.rounded_rectangle([size * 0.05, size * 0.05, size * 0.95, size * 0.95], radius=radius, outline=(255, 255, 255, 60), width=max(2, size // 60))

    plate_box = [size * 0.14, size * 0.48, size * 0.86, size * 0.74]
    draw.ellipse(plate_box, fill=(255, 255, 255, 255))
    draw.ellipse([plate_box[0] + size * 0.03, plate_box[1] + size * 0.03, plate_box[2] - size * 0.03, plate_box[3] - size * 0.02], outline=(210, 210, 210, 255), width=max(2, size // 90))

    dome_box = [size * 0.23, size * 0.33, size * 0.77, size * 0.57]
    draw.ellipse(dome_box, fill=(255, 154, 41, 255))

    highlight_box = [size * 0.46, size * 0.28, size * 0.66, size * 0.38]
    draw.ellipse(highlight_box, fill=(255, 220, 132, 230))

    draw.rectangle([size * 0.29, size * 0.49, size * 0.71, size * 0.55], fill=(255, 155, 41, 255))

    spoon_w = size * 0.06
    spoon_len = size * 0.22
    spoon_x = size * 0.62
    spoon_y = size * 0.34
    draw.rounded_rectangle([spoon_x, spoon_y, spoon_x + spoon_len, spoon_y + spoon_w], radius=int(size * 0.03), fill=(255, 255, 255, 255))
    draw.ellipse([spoon_x + spoon_len - spoon_w * 0.5, spoon_y - spoon_w * 0.3, spoon_x + spoon_len + spoon_w * 0.2, spoon_y + spoon_w * 1.3], fill=(255, 255, 255, 255))

    draw.ellipse([size * 0.52, size * 0.3, size * 0.59, size * 0.36], fill=(255, 255, 255, 255))

    star_center = (size * 0.32, size * 0.28)
    points = []
    for i in range(5):
        angle = i * 2 * math.pi / 5 - math.pi / 2
        r = size * (0.036 if i % 2 == 0 else 0.016)
        points.append((star_center[0] + math.cos(angle) * r, star_center[1] + math.sin(angle) * r))
    draw.polygon(points, fill=(255, 255, 255, 255))

    img.save(path, optimize=True)

if __name__ == '__main__':
    create_icon(192, 'assets/icon-192.png')
    create_icon(512, 'assets/icon-512.png')
