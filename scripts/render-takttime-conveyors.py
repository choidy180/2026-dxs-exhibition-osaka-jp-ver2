"""Blender background renderer for three periodic, silent factory conveyor clips.

blender --background --factory-startup --python scripts/render-takttime-conveyors.py -- --preview
blender --background --factory-startup --python scripts/render-takttime-conveyors.py -- --line all
The 144-frame cycle is repeated ten times by package-takttime-videos.mjs.
"""
import argparse
import json
import math
import sys
import warnings
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

warnings.filterwarnings('ignore', category=DeprecationWarning)

ROOT = Path(__file__).resolve().parents[1]
FRAMES = 144
FPS = 24
PERIOD = FRAMES / FPS
PITCH = 2.4
TRAVEL = PITCH * 3
MOVERS = []
SLATS = []


def material(name, rgb, metallic=0.0, roughness=0.4, texture=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    p = nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    if texture:
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 145
        noise.inputs['Detail'].default_value = 2
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = texture
        bump.inputs['Distance'].default_value = 0.012
        links.new(noise.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], p.inputs['Normal'])
        variation = nodes.new('ShaderNodeValToRGB')
        variation.color_ramp.elements[0].position = .2
        variation.color_ramp.elements[0].color = (*(v*.72 for v in rgb), 1)
        variation.color_ramp.elements[1].position = .8
        variation.color_ramp.elements[1].color = (*rgb, 1)
        links.new(noise.outputs['Fac'], variation.inputs['Fac'])
        links.new(variation.outputs['Color'], p.inputs['Base Color'])
    return m


def finish(obj, name, mat, parent=None, bevel=0.0):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    if bevel:
        mod = obj.modifiers.new('Manufactured edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
        mod.keep_sharp = True
    return obj


def box(name, pos, dims, mat, parent=None, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent, bevel)


def cylinder(name, pos, radius, depth, mat, parent=None, axis='Z', vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=pos)
    obj = bpy.context.object
    if axis == 'X':
        obj.rotation_euler[1] = math.pi / 2
    elif axis == 'Y':
        obj.rotation_euler[0] = math.pi / 2
    for poly in obj.data.polygons:
        poly.use_smooth = len(poly.vertices) == 4
    return finish(obj, name, mat, parent, 0.007)


def ring(name, pos, outer, inner, depth, mat, parent=None):
    # 사각 면으로 중공 부품을 구성해 불리언 연산의 불안정성을 피한다.
    vertices, faces = [], []
    n = 64
    for z, r in [(pos[2]-depth/2, outer), (pos[2]+depth/2, outer),
                 (pos[2]-depth/2, inner), (pos[2]+depth/2, inner)]:
        vertices.extend((pos[0]+r*math.cos(i*2*math.pi/n), pos[1]+r*math.sin(i*2*math.pi/n), z) for i in range(n))
    for i in range(n):
        j = (i+1) % n
        faces.extend([(i,j,n+j,n+i), (2*n+i,3*n+i,3*n+j,2*n+j),
                      (n+i,n+j,3*n+j,3*n+i), (i,2*n+i,2*n+j,j)])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat, parent, 0.008)


def tube(name, points, radius, mat, parent=None):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    poly = curve.splines.new('BEZIER')
    poly.bezier_points.add(len(points)-1)
    for bp, p in zip(poly.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def bolt(pos, parent=None, scale=1):
    cylinder('Hex fastener', pos, 0.035*scale, 0.018*scale, M['steel'], parent, vertices=6)


def light(name, pos, power, size, target, color=(1,1,1), size_y=None):
    bpy.ops.object.light_add(type='AREA', location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = power
    obj.data.shape = 'RECTANGLE'
    obj.data.size = size
    obj.data.size_y = size_y or size
    obj.data.color = color
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def environment(line):
    global M
    M = {
        'steel': material('Satin stainless steel', (0.52,0.56,0.59), .87,.27,.07),
        'darkmetal': material('Powder coated graphite', (.065,.080,.085),.55,.38,.10),
        'white': material('Moulded appliance ABS', (.80,.815,.79),.02,.28,.035),
        'foam': material('Exposed polyurethane insulation', (.68,.62,.43),0,.87,.4),
        'belt': material('Woven industrial belt', (.052,.078,.074) if line!='assembly-2' else (.052,.095,.12),0,.83,.19),
        'rubber': material('Black EPDM', (.015,.022,.024),0,.64,.09),
        'blue': material('Industrial blue polymer', (.023,.105,.19),.08,.30,.04),
        'floor': material('Factory epoxy floor', (.22,.24,.235),.03,.74,.08),
        'wall': material('Painted factory wall', (.46,.49,.47),0,.85,.04),
        'yellow': material('Machine safety yellow', (.73,.47,.045),.1,.42),
        'red': material('Emergency stop button', (.42,.018,.012),.03,.28),
        'copper': material('Copper tube', (.55,.25,.105),.85,.30),
    }
    box('Epoxy factory floor', (0,0,-.12), (45,35,.2), M['floor'], bevel=0)
    box('Back wall', (0,7,3.8), (45,.2,8), M['wall'], bevel=0)
    for x in range(-18,19,6):
        box('Structural column', (x,6.65,3), (.28,.4,6), M['white'])
        box('Floor expansion joint', (x,0,-.014), (.018,28,.005), M['darkmetal'], bevel=0)
        box('Far aisle production cabinet', (x,4.8,1), (2.8,.9,2), M['white'])
        box('Cabinet split', (x,4.33,1), (.018,.014,1.65), M['darkmetal'], bevel=0)
        for xx in (x-.12,x+.12):
            box('Cabinet handle', (xx,4.28,1.2), (.035,.04,.30), M['darkmetal'])
        for k in range(6):
            box('Cabinet ventilation slit', (x-.8+k*.12,4.325,.45), (.055,.015,.27), M['darkmetal'], bevel=.005)
    for y in (2.25,-2.25):
        box('Safety aisle marking', (0,y,-.006), (42,.08,.008), M['yellow'], bevel=0)
    # 벨트를 화각 밖까지 이어 부품의 출입이 장면 전환 없이 보이게 한다.
    box('Conveyor welded chassis', (0,0,.76), (40,2.2,.34), M['darkmetal'])
    box('Conveyor continuous belt', (0,0,.966), (40,1.85,.08), M['belt'], bevel=.007)
    for y in (-1.05,1.05):
        box('Extruded aluminium side frame', (0,y,.94), (40,.11,.28), M['steel'], bevel=.014)
        box('Side frame groove', (0,y+(-.058 if y<0 else .058),.94), (40,.004,.028), M['darkmetal'], bevel=0)
        box('Low guide rail', (0,y,1.07), (40,.055,.065), M['steel'], bevel=.015)
    for x in range(-18,19,3):
        for y in (-.83,.83):
            box('Adjustable conveyor stand', (x,y,.36), (.13,.13,.72), M['steel'])
            cylinder('Adjustable foot', (x,y,.05), .13,.07,M['rubber'])
            bolt((x,y,1.045), scale=.9)
        box('Stand crossmember', (x,0,.27), (.13,1.75,.10), M['steel'])
    for i in range(-112,113):
        x=i*.18
        seam=box('Belt modular seam', (x,0,1.008), (.009,1.835,.003), M['rubber'], bevel=0)
        SLATS.append((seam,x))
    # 센서와 케이블은 고정해 현장 카메라에서 보이는 주변 설비를 표현한다.
    for x in (-4.2,4.2):
        box('Photoelectric sensor post', (x,1.26,1.20), (.07,.07,.65), M['steel'])
        box('Photoelectric sensor', (x,1.13,1.42), (.12,.17,.12), M['darkmetal'])
        cylinder('Sensor lens', (x,1.035,1.42), .036,.014,M['red'],axis='Y')
        tube('Sensor cable', [(x,1.3,1.4),(x+.1,1.45,.7),(x+.25,1.1,.5)], .014,M['rubber'])
    box('Control station pedestal', (5.0,1.95,.7), (.16,.16,1.4), M['steel'])
    panel=box('Operator control panel', (5,1.9,1.55), (.65,.18,.43), M['white'])
    box('Unlabelled dark control screen', (4.9,1.795,1.56), (.32,.018,.23), M['darkmetal'])
    cylinder('Emergency stop', (5.2,1.78,1.57), .066,.065,M['red'],axis='Y')
    light('Large factory ceiling softbox', (-2,-1,7), 1800,7,(0,0,0),(.93,.97,1),3)
    light('Strip light reflection', (1,4,5), 1300,8,(0,0,1),(1,.96,.87),1.2)
    light('Front warehouse fill', (0,-6,3), 650,5,(0,0,1),(.84,.91,1),3)


def foaming(parent, variant):
    xdim=(1.50,1.72,1.38)[variant]
    ydim=(1.38,1.22,1.42)[variant]
    box('Insulated door backing', (0,0,1.07), (xdim,ydim,.12), M['foam'],parent,.055)
    box('White door outer skin', (0,0,1.14), (xdim+.045,ydim+.045,.065), M['white'],parent,.055)
    box('Recessed door liner', (0,0,1.19), (xdim-.17,ydim-.17,.07), M['white'],parent,.06)
    for y in (-ydim/2+.055,ydim/2-.055):
        box('Moulded rim long side',(0,y,1.255),(xdim,.095,.22),M['white'],parent,.034)
    for x in (-xdim/2+.05,xdim/2-.05):
        box('Moulded rim short side',(x,0,1.255),(.095,ydim-.12,.22),M['white'],parent,.032)
    for y in (-ydim/2+.12,ydim/2-.12):
        box('Door gasket groove',(0,y,1.38),(xdim-.16,.024,.012),M['rubber'],parent,.008)
    for j in range(variant+2):
        x=-xdim*.30+j*xdim*.60/(variant+1)
        box('Door liner reinforcing rib',(x,0,1.25),(.065,ydim-.31,.12),M['white'],parent,.026)
    for x in (-xdim/2+.10,xdim/2-.10):
        for y in (-ydim/2+.1,ydim/2-.1):
            bolt((x,y,1.379),parent,.6)


def assembly_1(parent, variant):
    box('Reusable process pallet',(0,0,1.045),(1.70,1.4,.075),M['blue'],parent,.035)
    if variant==0:
        box('Die cast motor housing foot',(0,0,1.15),(1.12,.92,.13),M['steel'],parent,.045)
        ring('Machined cylindrical housing',(0,0,1.39),.41,.28,.40,M['steel'],parent)
        for j in range(12):
            a=j*math.tau/12
            obj=box('Housing cooling fin',(.43*math.cos(a),.43*math.sin(a),1.35),(.075,.11,.33),M['steel'],parent,.008)
            obj.rotation_euler[2]=a
        for x in (-.47,.47):
            for y in (-.36,.36): bolt((x,y,1.23),parent)
    elif variant==1:
        for x in (-.44,.44):
            box('Stamped mounting bracket base',(x,0,1.15),(.6,.93,.08),M['steel'],parent,.027)
            box('Stamped mounting bracket wall',(x,.30,1.36),(.6,.08,.46),M['steel'],parent,.026)
            for y in (-.3,0):
                cylinder('Bracket bore shadow',(x,y,1.194),.068,.008,M['darkmetal'],parent)
                ring('Bore machined rim',(x,y,1.20),.077,.066,.01,M['steel'],parent)
            for xx in (x-.16,x+.16): bolt((xx,-.32,1.20),parent,.8)
    else:
        for x in (-.47,.47):
            ring('Machined bearing seat',(x,0,1.24),.32,.18,.28,M['steel'],parent)
            ring('Dark bearing seal',(x,0,1.385),.26,.185,.018,M['rubber'],parent)
            ring('Polished inner race',(x,0,1.4),.19,.12,.04,M['steel'],parent)
            for y in (-.42,.42):
                box('Bearing mount lug',(x,y,1.17),(.35,.2,.12),M['steel'],parent,.03)
                bolt((x,y,1.242),parent,1.0)


def assembly_2(parent, variant):
    box('Assembly carrier tray',(0,0,1.04),(1.8,1.40,.065),M['darkmetal'],parent,.035)
    for y in (-.66,.66): box('Carrier locating rail',(0,y,1.10),(1.8,.055,.09),M['steel'],parent,.018)
    if variant==0:
        for x in (-.45,.45):
            cylinder('Water filter cartridge',(x,0,1.25),.16,.93,M['white'],parent,axis='Y')
            cylinder('Filter blue end cap',(x,-.47,1.25),.177,.13,M['blue'],parent,axis='Y')
            cylinder('Filter inlet',(x,-.56,1.25),.055,.08,M['white'],parent,axis='Y')
            cylinder('Filter rear cap',(x,.49,1.25),.165,.11,M['white'],parent,axis='Y')
            for y in (-.26,.26): cylinder('Filter retaining collar',(x,y,1.25),.169,.033,M['steel'],parent,axis='Y')
    elif variant==1:
        box('Pump mounting plate',(0,0,1.13),(1.25,.9,.10),M['steel'],parent,.035)
        cylinder('Pump electric motor',(-.24,0,1.38),.245,.66,M['steel'],parent,axis='X')
        cylinder('Motor black end cap',(-.58,0,1.38),.251,.1,M['rubber'],parent,axis='X')
        cylinder('Pump head',(.25,0,1.38),.27,.31,M['darkmetal'],parent,axis='X')
        cylinder('Pump inlet',(.25,-.32,1.4),.075,.2,M['blue'],parent,axis='Y')
        tube('Pump copper connector',[(.25,.25,1.45),(.25,.40,1.49),(.40,.45,1.68),(.67,.45,1.68)],.035,M['copper'],parent)
        for x in (-.50,.50):
            for y in (-.32,.32): bolt((x,y,1.20),parent)
    else:
        box('Moulded water manifold',(0,0,1.24),(1.12,.79,.29),M['white'],parent,.07)
        for x in (-.34,0,.34):
            cylinder('Manifold valve collar',(x,-.47,1.26),.115,.16,M['blue'],parent,axis='Y')
            cylinder('Manifold connector',(x,-.58,1.26),.055,.1,M['white'],parent,axis='Y')
        for x in (-.34,.34):
            cylinder('Solenoid body',(x,.08,1.54),.125,.31,M['darkmetal'],parent)
            box('Solenoid electrical connector',(x,.08,1.73),(.19,.18,.12),M['blue'],parent,.024)
        tube('Manifold hose',[(.52,.12,1.24),(.72,.25,1.26),(.64,.48,1.36),(-.50,.48,1.36),(-.62,.16,1.26)],.026,M['white'],parent)


def animate(scene):
    t=(scene.frame_current-1)/FPS
    shift=TRAVEL*t/PERIOD
    for obj,x in MOVERS:
        obj.location.x=((x+shift+21.6)%43.2)-21.6
    for obj,x in SLATS:
        obj.location.x=((x+shift+20.25)%40.5)-20.25


def build(line, output):
    MOVERS.clear()
    SLATS.clear()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.materials): bpy.data.materials.remove(block)
    environment(line)
    builder={'foaming':foaming,'assembly-1':assembly_1,'assembly-2':assembly_2}[line]
    # 세 종류를 일정 간격으로 배치하고 6초마다 세 칸 이동시켜 반복 경계를 맞춘다.
    for i in range(-9,9):
        root=bpy.data.objects.new('Conveyor part assembly',None)
        bpy.context.collection.objects.link(root)
        builder(root,i%3)
        root.location.x=i*PITCH
        MOVERS.append((root,i*PITCH))
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.device='GPU'
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='OPTIX'
    prefs.get_devices()
    for device in prefs.devices: device.use=device.type=='OPTIX'
    scene.cycles.samples=48
    scene.cycles.use_denoising=True
    scene.cycles.use_adaptive_sampling=True
    scene.cycles.adaptive_threshold=.08
    scene.cycles.max_bounces=6
    scene.render.use_persistent_data=True
    scene.render.resolution_x=1280
    scene.render.resolution_y=720
    scene.render.resolution_percentage=100
    scene.render.fps=FPS
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGB'
    scene.render.image_settings.compression=25
    scene.render.film_transparent=False
    scene.world.color=(.28,.28,.28)
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.65,.72,.79,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.frame_start=1
    scene.frame_end=FRAMES
    bpy.ops.object.camera_add(location=(5.0,-7.7,6.1) if line=='foaming' else (4.0,-7.1,5.6))
    camera=bpy.context.object
    target=Vector((0,0,1.0))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='PERSP'
    camera.data.lens=48 if line=='foaming' else 46
    camera.data.dof.use_dof=False
    scene.camera=camera
    bpy.app.handlers.frame_change_pre.clear()
    bpy.app.handlers.frame_change_pre.append(animate)
    output.mkdir(parents=True,exist_ok=True)
    scene.render.filepath=str(output/'frame-')
    scene.frame_set(1)
    return scene


def export_tracking(scene, line):
    # 렌더링에 사용한 메시의 경계점을 카메라로 투영해 영상과 동일한 추적 좌표를 만든다.
    frames = []
    for frame in range(1, FRAMES + 2):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        objects = []
        for root, base_x in MOVERS:
            if abs(root.location.x) > 12:
                continue
            points = []
            for child in root.children_recursive:
                if child.type not in {'MESH', 'CURVE'}:
                    continue
                points.extend(world_to_camera_view(scene, scene.camera, child.matrix_world @ Vector(corner))
                              for corner in child.bound_box)
            if not points or any(p.z <= 0 for p in points):
                continue
            x0, x1 = min(p.x for p in points), max(p.x for p in points)
            y0, y1 = 1-max(p.y for p in points), 1-min(p.y for p in points)
            if x1 < 0 or x0 > 1 or y1 < 0 or y0 > 1:
                continue
            index = round(base_x / PITCH)
            objects.append({'id': index, 'kind': index % 3,
                            'x': round(x0, 6), 'y': round(y0, 6),
                            'width': round(x1-x0, 6), 'height': round(y1-y0, 6),
                            'worldX': round(root.location.x, 6)})
        frames.append(objects)
    gate = [world_to_camera_view(scene, scene.camera, Vector((0, y, 1.02))) for y in (-.93, .93)]
    payload = {'width': 1280, 'height': 720, 'fps': FPS, 'cycleSeconds': PERIOD,
               'partIntervalSeconds': PITCH / TRAVEL * PERIOD,
               'gate': [[round(p.x,6),round(1-p.y,6)] for p in gate], 'frames': frames}
    destination = ROOT/'data'/'takttime-tracking'
    destination.mkdir(parents=True, exist_ok=True)
    (destination/f'{line}.json').write_text(json.dumps(payload, separators=(',', ':'))+'\n', encoding='utf-8')
    print(f'TRACKING EXPORTED {line}: {len(frames)} frames', flush=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--line', choices=['all','foaming','assembly-1','assembly-2'],default='all')
    parser.add_argument('--preview',action='store_true')
    parser.add_argument('--tracking-only',action='store_true')
    parser.add_argument('--start',type=int,default=1)
    parser.add_argument('--end',type=int,default=FRAMES)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    lines=['foaming','assembly-1','assembly-2'] if args.line=='all' else [args.line]
    for line in lines:
        output=ROOT/'tmp'/'takttime-conveyors'/line
        scene=build(line,output)
        if args.tracking_only:
            export_tracking(scene, line)
        elif args.preview:
            scene.render.filepath=str(output/'preview.png')
            bpy.ops.render.render(write_still=True)
        else:
            scene.frame_start=args.start
            scene.frame_end=args.end
            bpy.ops.render.render(animation=True)
        print(f'COMPLETED {line}',flush=True)


if __name__=='__main__': main()
