import resvg_py
from PIL import Image

with open('d:/Baseball AR/brewers_logo.svg', 'r') as f:
    glove_svg = f.read()

start_idx = glove_svg.find('<path')
end_idx = glove_svg.rfind('</svg>')
paths_content = glove_svg[start_idx:end_idx]

patch_svg = f'''<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>
<!-- Navy Diamond with Gold Border -->
<polygon points='200,30 370,200 200,370 30,200' fill='#12284b' stroke='#ffc52f' stroke-width='14' stroke-linejoin='round' />
<polygon points='200,45 355,200 200,355 45,200' fill='#12284b' stroke='#ffffff' stroke-width='4' stroke-linejoin='round' />
<!-- Glove Logo centered -->
<g transform='translate(122, 115) scale(1.0)'>
{paths_content}
</g>
</svg>'''

png = resvg_py.svg_to_bytes(patch_svg)
with open('d:/Baseball AR/brewers_diamond_patch.png', 'wb') as f:
    f.write(png)

im = Image.open('d:/Baseball AR/brewers_diamond_patch.png')
print('Rendered Brewers diamond patch:', im.size, im.getbbox())
