import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

WIDTH = 2048
HEIGHT = 2048

def make_fabric_texture(base_rgb, noise_amount=3.0):
    arr = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = base_rgb[c]
        
    y, x = np.mgrid[0:HEIGHT, 0:WIDTH]
    # Athletic diamond knit weave pattern
    knit = (np.sin(x * 0.9) * np.cos(y * 0.9)) * noise_amount
    np.random.seed(42)
    thread = (np.random.rand(HEIGHT, WIDTH) - 0.5) * (noise_amount * 1.5)
    
    for c in range(3):
        arr[:, :, c] = np.clip(arr[:, :, c] + knit + thread, 0, 255)
        
    return Image.fromarray(arr.astype(np.uint8), mode='RGB')

print("1. Loading cleaned reference assets...")
im_nat_script = Image.open('d:/Baseball AR/perfect_nationals_script.png').convert('RGBA')
im_brv_script = Image.open('d:/Baseball AR/perfect_braves_script.png').convert('RGBA')
im_brew_script = Image.open('d:/Baseball AR/brewers_chest_wordmark.png').convert('RGBA')
im_brew_patch = Image.open('d:/Baseball AR/brewers_diamond_patch.png').convert('RGBA')
im_nat_patch = Image.open('d:/Baseball AR/nationals_logo_512.png').convert('RGBA')
im_sw_white = Image.open('d:/Baseball AR/perfect_swoosh_white.png').convert('RGBA')
im_jocktag = Image.open('d:/Baseball AR/clean_mlb_jocktag.png').convert('RGBA')

# Create perfect navy swoosh
arr_sw = np.array(im_sw_white)
navy_sw = np.zeros_like(arr_sw)
navy_sw[:, :, 0] = 18
navy_sw[:, :, 1] = 38
navy_sw[:, :, 2] = 75
navy_sw[:, :, 3] = arr_sw[:, :, 3]
im_sw_navy = Image.fromarray(navy_sw)

# Sizes for composite
sw_white_res = im_sw_white.resize((140, 70), Image.Resampling.LANCZOS)
sw_navy_res = im_sw_navy.resize((140, 70), Image.Resampling.LANCZOS)
jocktag_res = im_jocktag.resize((220, 95), Image.Resampling.LANCZOS)


# =========================================================================
# 1. WASHINGTON NATIONALS (BLACK JERSEY)
# =========================================================================
print("2. Building Washington Nationals texture...")
# Deep rich black jersey fabric
tex_nat = make_fabric_texture((18, 20, 24), noise_amount=2.5)
draw_nat = ImageDraw.Draw(tex_nat, 'RGBA')

red_nat = (171, 0, 3, 255)
white = (255, 255, 255, 255)

# Collar Ribbing piping (Y in [20, 120], X in [716, 1331])
draw_nat.rectangle([680, 20, 1368, 120], fill=red_nat)
draw_nat.rectangle([680, 55, 1368, 85], fill=white)

# Left sleeve cuff stripes (X in [1515, 2007], Y in [100, 200])
draw_nat.rectangle([1515, 100, 2007, 200], fill=red_nat)
draw_nat.rectangle([1515, 135, 2007, 165], fill=white)

# Right sleeve cuff stripes (X in [41, 532], Y in [100, 200])
draw_nat.rectangle([41, 100, 532, 200], fill=red_nat)
draw_nat.rectangle([41, 135, 532, 165], fill=white)

# Nationals Script across chest
nat_w = 860
nat_h = int(im_nat_script.height * (nat_w / im_nat_script.width))
nat_res = im_nat_script.resize((nat_w, nat_h), Image.Resampling.LANCZOS)
tex_nat.paste(nat_res, (1024 - nat_w // 2 - 15, 520), nat_res)

# Nike Swoosh on right chest (viewer's left)
tex_nat.paste(sw_white_res, (650, 410), sw_white_res)

# Left sleeve patch: Washington Nationals circular crest (viewer's right, X ~ 1760, Y ~ 410)
patch_size = 220
nat_patch_res = im_nat_patch.resize((patch_size, patch_size), Image.Resampling.LANCZOS)
tex_nat.paste(nat_patch_res, (1760 - patch_size // 2, 410 - patch_size // 2), nat_patch_res)

# Jocktag on lower left hem (viewer's right, X ~ 1300, Y ~ 1750)
tex_nat.paste(jocktag_res, (1280, 1750), jocktag_res)

tex_nat.save('d:/Baseball AR/jersey_tex_nationals.png', format='PNG')
print("-> Saved jersey_tex_nationals.png")


# =========================================================================
# 2. ATLANTA BRAVES (WHITE JERSEY)
# =========================================================================
print("3. Building Atlanta Braves texture...")
# Crisp clean white jersey fabric
tex_brv = make_fabric_texture((248, 249, 251), noise_amount=3.0)
draw_brv = ImageDraw.Draw(tex_brv, 'RGBA')

navy_brv = (19, 39, 79, 255)
scarlet_brv = (206, 17, 65, 255)

# Collar Ribbing piping (Y in [20, 120])
draw_brv.rectangle([680, 25, 1368, 115], fill=navy_brv)
draw_brv.rectangle([680, 52, 1368, 88], fill=scarlet_brv)

# Placket vertical piping: dual thin lines running down along placket border
draw_brv.rectangle([948, 440, 958, 2048], fill=navy_brv)
draw_brv.rectangle([958, 440, 966, 2048], fill=scarlet_brv)
draw_brv.rectangle([1082, 440, 1090, 2048], fill=scarlet_brv)
draw_brv.rectangle([1090, 440, 1100, 2048], fill=navy_brv)

# Left sleeve cuff stripes (Y in [100, 200])
draw_brv.rectangle([1515, 100, 2007, 200], fill=navy_brv)
draw_brv.rectangle([1515, 135, 2007, 165], fill=scarlet_brv)

# Right sleeve cuff stripes
draw_brv.rectangle([41, 100, 532, 200], fill=navy_brv)
draw_brv.rectangle([41, 135, 532, 165], fill=scarlet_brv)

# Braves Script + Tomahawk across chest
brv_w = 900
brv_h = int(im_brv_script.height * (brv_w / im_brv_script.width))
brv_res = im_brv_script.resize((brv_w, brv_h), Image.Resampling.LANCZOS)
tex_brv.paste(brv_res, (1024 - brv_w // 2 - 10, 520), brv_res)

# Nike Swoosh on right chest (viewer's left)
tex_brv.paste(sw_navy_res, (650, 410), sw_navy_res)

# Jocktag on lower left hem
tex_brv.paste(jocktag_res, (1280, 1750), jocktag_res)

tex_brv.save('d:/Baseball AR/jersey_tex_braves.png', format='PNG')
print("-> Saved jersey_tex_braves.png")


# =========================================================================
# 3. MILWAUKEE BREWERS (CREAM JERSEY)
# =========================================================================
print("4. Building Milwaukee Brewers texture...")
# Warm vintage cream jersey fabric
tex_brew = make_fabric_texture((242, 236, 221), noise_amount=3.0)
draw_brew = ImageDraw.Draw(tex_brew, 'RGBA')

navy_brew = (18, 40, 75, 255)
gold_brew = (255, 197, 47, 255)

# Left sleeve cuff stripes: Navy, Gold, Navy
draw_brew.rectangle([1515, 100, 2007, 200], fill=navy_brew)
draw_brew.rectangle([1515, 130, 2007, 170], fill=gold_brew)

# Right sleeve cuff stripes
draw_brew.rectangle([41, 100, 532, 200], fill=navy_brew)
draw_brew.rectangle([41, 130, 532, 170], fill=gold_brew)

# Brewers Arched Wordmark across chest
brew_bbox = im_brew_script.getbbox()
im_brew_cropped = im_brew_script.crop(brew_bbox)
brew_w = 920
brew_h = int(im_brew_cropped.height * (brew_w / im_brew_cropped.width))
brew_res = im_brew_cropped.resize((brew_w, brew_h), Image.Resampling.LANCZOS)
tex_brew.paste(brew_res, (1024 - brew_w // 2, 530), brew_res)

# Left chest diamond patch: Brewers ball-in-glove (viewer's right, X ~ 1400, Y ~ 380)
patch_w = 180
brew_patch_res = im_brew_patch.resize((patch_w, patch_w), Image.Resampling.LANCZOS)
tex_brew.paste(brew_patch_res, (1390 - patch_w // 2, 380 - patch_w // 2), brew_patch_res)

# Nike Swoosh on right chest (viewer's left)
tex_brew.paste(sw_navy_res, (650, 410), sw_navy_res)

# Jocktag on lower left hem
tex_brew.paste(jocktag_res, (1280, 1750), jocktag_res)

tex_brew.save('d:/Baseball AR/jersey_tex_brewers.png', format='PNG')
print("-> Saved jersey_tex_brewers.png")

print("All 3 textures perfected!")
