import os
from PIL import Image, ImageDraw

def draw_gradient_circle(draw, center, radius, color_start, color_end):
    """Draws a circle with a radial gradient to look 3D."""
    cx, cy = center
    for r in range(radius, 0, -1):
        # Interpolate color
        t = r / radius
        r_col = int(color_start[0] * (1 - t) + color_end[0] * t)
        g_col = int(color_start[1] * (1 - t) + color_end[1] * t)
        b_col = int(color_start[2] * (1 - t) + color_end[2] * t)
        
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(r_col, g_col, b_col))

def generate_all_samples(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    # Common dimensions
    width, height = 500, 500
    bg_color = (240, 242, 245) # Clean off-white
    
    # ----------------------------------------------------
    # 1. Fresh Apple
    # ----------------------------------------------------
    img_apple = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img_apple)
    
    # Draw leaf (green ellipse)
    draw.ellipse([250, 100, 310, 150], fill=(46, 125, 50))
    # Draw stem (brown rectangle/lines)
    draw.line([250, 150, 260, 110], fill=(121, 85, 72), width=8)
    
    # Draw apple body (two overlapping red circles for the apple shape)
    draw_gradient_circle(draw, (225, 270), 110, (239, 83, 80), (183, 28, 28)) # Left lobe
    draw_gradient_circle(draw, (275, 270), 110, (239, 83, 80), (183, 28, 28)) # Right lobe
    
    # Add a shine/highlight (white ellipse with opacity/small size)
    draw.ellipse([180, 200, 220, 240], fill=(255, 200, 200))
    
    img_apple.save(os.path.join(output_dir, "fresh_apple.jpg"), quality=95)
    
    # ----------------------------------------------------
    # 2. Spotted Banana
    # ----------------------------------------------------
    img_banana = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img_banana)
    
    # Draw banana as a curved path (multiple yellow circles in a curve)
    points = []
    # Curve equation: x = a * t^2 + b, y = c * t
    for i in range(25):
        t = (i - 12) / 10.0 # -1.2 to 1.2
        bx = int(250 + 130 * (t * t - 0.5))
        by = int(250 + 130 * t)
        radius = int(35 - 8 * abs(t)) # Thicker in center, thinner at tips
        draw.ellipse([bx - radius, by - radius, bx + radius, by + radius], fill=(253, 216, 53))
        points.append((bx, by, radius))
        
    # Draw dark green/brown tips
    draw.ellipse([points[0][0] - 12, points[0][1] - 12, points[0][0] + 12, points[0][1] + 12], fill=(62, 39, 35))
    draw.ellipse([points[-1][0] - 15, points[-1][1] - 15, points[-1][0] + 15, points[-1][1] + 15], fill=(93, 64, 55))
    
    # Add brown sugar spots (senescent spots)
    spots = [
        (220, 180, 5), (200, 210, 7), (180, 250, 4), (190, 270, 6),
        (220, 310, 5), (250, 330, 4), (280, 320, 8), (200, 150, 6)
    ]
    for sx, sy, sr in spots:
        draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(93, 64, 55))
        
    img_banana.save(os.path.join(output_dir, "spotted_banana.jpg"), quality=95)
    
    # ----------------------------------------------------
    # 3. Diseased Tomato
    # ----------------------------------------------------
    img_tomato = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img_tomato)
    
    # Draw tomato body (large red circle)
    draw_gradient_circle(draw, (250, 260), 130, (244, 67, 54), (198, 40, 40))
    
    # Draw tomato green stem calyx on top
    draw.polygon([(250, 130), (235, 110), (250, 125), (265, 110)], fill=(46, 125, 50))
    draw.polygon([(250, 130), (215, 125), (245, 130), (285, 125)], fill=(46, 125, 50))
    
    # Draw blight disease lesions (concentric brown circles)
    # Lesion 1
    draw.ellipse([270, 240, 330, 300], fill=(78, 52, 46))
    draw.ellipse([280, 250, 320, 290], fill=(62, 39, 35))
    draw.ellipse([290, 260, 310, 280], fill=(33, 33, 33))
    
    # Lesion 2 (Smaller)
    draw.ellipse([170, 200, 210, 240], fill=(78, 52, 46))
    draw.ellipse([175, 205, 205, 235], fill=(62, 39, 35))
    
    img_tomato.save(os.path.join(output_dir, "diseased_tomato.jpg"), quality=95)
    
    # ----------------------------------------------------
    # 4. Mixed Produce (Multi-Object)
    # ----------------------------------------------------
    # Apple (left), Orange (center), Lemon (right)
    img_mixed = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img_mixed)
    
    # A. Draw Apple on the Left
    draw.ellipse([80, 110, 110, 140], fill=(46, 125, 50)) # leaf
    draw.line([95, 140, 100, 120], fill=(121, 85, 72), width=5) # stem
    draw_gradient_circle(draw, (110, 220), 65, (239, 83, 80), (183, 28, 28))
    draw_gradient_circle(draw, (140, 220), 65, (239, 83, 80), (183, 28, 28))
    
    # B. Draw Orange in Center/Bottom
    draw_gradient_circle(draw, (300, 320), 85, (255, 167, 38), (230, 81, 0))
    # Give it dimples/texturing with minor dots
    for dx, dy in [(270, 280), (290, 300), (320, 290), (310, 330), (280, 350), (340, 340)]:
        draw.ellipse([dx, dy, dx+3, dy+3], fill=(245, 124, 0))
        
    # C. Draw Lemon on the Right
    # Lemons are egg-shaped (draw overlapping ellipses or offset circles)
    draw_gradient_circle(draw, (380, 170), 50, (255, 235, 59), (251, 192, 45))
    draw_gradient_circle(draw, (420, 185), 45, (255, 235, 59), (251, 192, 45))
    
    img_mixed.save(os.path.join(output_dir, "mixed_produce.jpg"), quality=95)

if __name__ == "__main__":
    import sys
    # If run directly
    output = "samples"
    if len(sys.argv) > 1:
        output = sys.argv[1]
    generate_all_samples(output)
    print("Done generating sample images in", output)
