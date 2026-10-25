import bpy
import bmesh
import math
from mathutils import Vector, Matrix

def create_baseball_jersey_mesh(name="Jersey_Base"):
    # Create mesh and object
    mesh = bpy.data.meshes.new(name + "_Mesh")
    obj = bpy.data.objects.new(name, mesh)
    
    bm = bmesh.new()
    
    # Grid parameters
    n_rings = 24       # vertical rings from neck/shoulder to hem
    n_seg = 32         # segments around torso
    
    # Rings definition: z height, half-width (X), half-depth (Y), and vertical shift for hem/shoulders
    # We will build torso vertices ring by ring
    ring_verts = []
    
    for r in range(n_rings):
        t = r / (n_rings - 1) # 0 at shoulders/collar (top), 1 at bottom hem
        z_base = 1.35 - t * 1.35
        
        # Athletic baseball jersey profile
        # w_factor: shoulder broad, chest full, waist slightly tapered, hem slightly flared
        if t < 0.25: # shoulders to chest
            s = t / 0.25
            hw = 0.32 + 0.16 * s
            hd = 0.16 + 0.08 * s
        elif t < 0.65: # chest to waist
            s = (t - 0.25) / 0.40
            hw = 0.48 - 0.05 * s
            hd = 0.24 - 0.03 * s
        else: # waist to hem
            s = (t - 0.65) / 0.35
            hw = 0.43 + 0.04 * s
            hd = 0.21 + 0.02 * s
            
        current_ring = []
        for i in range(n_seg):
            phi = 2.0 * math.pi * (i / n_seg)
            # Front is phi = 0, Left is phi = pi/2, Back is phi = pi, Right is phi = 3pi/2
            # Superellipse shape for natural human torso
            cos_p = math.cos(phi)
            sin_p = math.sin(phi)
            
            # Normalization for superellipse (exponent ~ 2.4 gives flat front/back and rounded sides)
            px = hw * math.copysign(abs(sin_p)**0.85, sin_p)
            # Chest curve / back curve
            py = -hd * math.copysign(abs(cos_p)**0.90, cos_p)
            
            # Hem scoop: bottom rings curve up at sides (sin_p**2) and dip at front/back
            z = z_base
            if t > 0.70:
                hem_factor = (t - 0.70) / 0.30
                # sides (sin_p != 0) are higher by up to 0.12m
                side_arch = (sin_p ** 2) * 0.11 * hem_factor
                z += side_arch
            
            # Collar / V-neck opening in front (phi near 0, cos_p > 0.6, top rings t < 0.28)
            # We skip creating faces or pull vertices back for V-neck
            v = bm.verts.new((px, py, z))
            current_ring.append(v)
            
        ring_verts.append(current_ring)
        
    bm.verts.ensure_lookup_table()
    
    # Create quad faces between rings
    # For V-neck (front center, top 6 rings), we do not create faces to form the V-neck collar!
    for r in range(n_rings - 1):
        for i in range(n_seg):
            i_next = (i + 1) % n_seg
            phi = 2.0 * math.pi * (i / n_seg)
            
            # V-neck check: front center is near i = 0 (i in [n_seg-3..n_seg-1] or i in [0..2])
            # V opens wider at top (r = 0..6)
            is_vneck = False
            if r < 7:
                v_width = int(round(3.5 * (1.0 - r / 7.0)))
                dist_front = min(i, n_seg - i)
                if dist_front < v_width:
                    is_vneck = True
            
            # Armhole check: sides are near phi = pi/2 (left, i ~ 8) and phi = 3pi/2 (right, i ~ 24)
            # Armholes located between rings r = 2 and r = 9
            is_armhole = False
            if 3 <= r <= 8:
                dist_left = abs(i - n_seg // 4)
                dist_right = abs(i - 3 * n_seg // 4)
                if dist_left <= 2 or dist_right <= 2:
                    is_armhole = True
            
            if not is_vneck and not is_armhole:
                v1 = ring_verts[r][i]
                v2 = ring_verts[r][i_next]
                v3 = ring_verts[r+1][i_next]
                v4 = ring_verts[r+1][i]
                bm.faces.new((v1, v4, v3, v2))
                
    # Close top shoulders (between neck and armholes)
    # Ring 0 has top vertices. Connect left shoulder and right shoulder across front-to-back
    # Left shoulder: i from 3 to 6 connected to i from 10 to 13?
    # Actually, a smooth cap/shoulder seam across the top of ring 0:
    for i in range(3, 7):
        opp = (n_seg // 2) - i
        if opp > i:
            # bm.faces.new(...)
            pass
            
    bm.to_mesh(mesh)
    bm.free()
    
    # Add modifiers
    subsurf = obj.modifiers.new("Subdivision", 'SUBSURF')
    subsurf.levels = 1
    subsurf.render_levels = 2
    
    solid = obj.modifiers.new("Solidify", 'SOLIDIFY')
    solid.thickness = 0.006
    solid.offset = 0.0
    
    return obj

print("Baseball jersey generator loaded.")
