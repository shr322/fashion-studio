"""Original, stylized sample mannequins. No external assets. Requires numpy/trimesh only to regenerate; GLBs included."""
import json, struct, math
from pathlib import Path
import numpy as np
import trimesh
ROOT=Path(__file__).resolve().parents[1]

def make(look):
 b=bytearray(); views=[]; acc=[]; meshes=[]; nodes=[]; mats=[]; samplers=[]; channels=[]
 def accessor(a, typ, comp, target=None):
  a=np.asarray(a,dtype={5126:'<f4',5125:'<u4'}[comp]);
  while len(b)%4:b.append(0)
  off=len(b); raw=a.tobytes(); b.extend(raw); v={'buffer':0,'byteOffset':off,'byteLength':len(raw)}
  if target:v['target']=target
  views.append(v); ac={'bufferView':len(views)-1,'componentType':comp,'count':len(a),'type':typ}
  if typ=='VEC3' and target==34962:ac.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
  if typ=='SCALAR' and comp==5126:ac.update(min=[float(a.min())],max=[float(a.max())])
  acc.append(ac);return len(acc)-1
 def mat(name,c,rough=.82):
  mats.append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':[*c,1],'metallicFactor':0,'roughnessFactor':rough}});return len(mats)-1
 white=mat('Porcelain matte',(.82,.80,.75)); dark=mat('Shoes',(.035,.028,.025)); fabric=mat('Main textile',[(.47,.34,.22),(.075,.11,.17),(.40,.17,.18)][look]); detail=mat('Seam / lapel',[(.30,.20,.12),(.039,.061,.09),(.28,.095,.11)][look]); lining=mat('Inner garment',(.79,.74,.65)); button=mat('Buttons',(.09,.07,.055))
 def node(name,parent=None,t=(0,0,0),mesh=None,rot=None):
  d={'name':name,'translation':list(t)}
  if mesh is not None:d['mesh']=mesh
  if rot is not None:d['rotation']=list(rot)
  nodes.append(d); i=len(nodes)-1
  if parent is not None:nodes[parent].setdefault('children',[]).append(i)
  return i
 def mesh(name,geo,material,parent,t=(0,0,0)):
  p=np.asarray(geo.vertices); n=np.asarray(geo.vertex_normals); f=np.asarray(geo.faces).reshape(-1)
  meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':accessor(p,'VEC3',5126,34962),'NORMAL':accessor(n,'VEC3',5126,34962)},'indices':accessor(f,'SCALAR',5125,34963),'material':material}]});return node(name,parent,t,len(meshes)-1)
 def sphere(name,scale,center,material,parent):
  g=trimesh.creation.icosphere(subdivisions=3);g.apply_scale(scale);return mesh(name,g,material,parent,center)
 def rings(name,profile,material,parent,t=(0,0,0),segments=40):
  # y, x radius, z radius, z center; bottom to top
  vs=[];fs=[]
  for y,rx,rz,z in profile:
   vs.extend([(rx*math.cos(2*math.pi*i/segments),y,z+rz*math.sin(2*math.pi*i/segments)) for i in range(segments)])
  for j in range(len(profile)-1):
   for i in range(segments):
    a=j*segments+i; bb=j*segments+(i+1)%segments;c=bb+segments;d=a+segments;fs.extend([(a,d,c),(a,c,bb)])
  for j,rev in [(0,False),(len(profile)-1,True)]:
   k=len(vs);vs.append((0,profile[j][0],profile[j][3]));base=j*segments
   for i in range(segments):
    a=base+i;bb=base+(i+1)%segments;fs.append((k,bb,a) if rev else (k,a,bb))
  g=trimesh.Trimesh(vs,fs,process=False);g.fix_normals();return mesh(name,g,material,parent,t)
 def panel(name,pts,material,parent):
  # flat decorative surface, double-sided by reversing faces
  g=trimesh.Trimesh(pts,[(0,i,i+1) for i in range(1,len(pts)-1)],process=False);return mesh(name,g,material,parent)
 def quat(x=0,z=0):
  return [math.sin(x/2)*math.cos(z/2),-math.sin(x/2)*math.sin(z/2),math.cos(x/2)*math.sin(z/2),math.cos(x/2)*math.cos(z/2)]
 root=node('Mannequin'); hip=node('Pelvis',root,(0,.94,0)); torso=node('Torso',hip,(0,0,0));
 rings('Torso',[(0,.154,.094,0),(.14,.118,.079,0),(.29,.17,.101,0),(.40,.192,.087,0),(.45,.070,.052,0)],white,torso)
 rings('Neck',[(.42,.049,.043,0),(.54,.047,.046,0)],white,torso)
 sphere('Faceless head',(.078,.113,.079),(0,.63,.005),white,torso)
 if look<2:
  rings('Tailored jacket' if look==1 else 'Belted coat', [(-.15 if look==0 else -.075,.196,.113,0),(.00,.171,.108,0),(.14,.133,.094,0),(.27,.174,.115,0),(.39,.204,.099,0),(.448,.081,.062,0)],fabric,torso)
  # front collar/lapels, simple raised shapes
  for s in [-1,1]:
   panel('Lapel',[(s*.054,.444,.065),(s*.117,.36,.103),(s*.087,.28,.122),(s*.121,.31,.119),(s*.017,.13,.103),(s*.032,.36,.118)],detail,torso)
  panel('Shirt',[(0,.42,.077),(-.042,.42,.075),(-.012,.22,.116),(.04,.42,.075)],lining,torso)
  for y in [.06,.15,.24]:sphere('Button',(.009,.009,.006),(.018,y,.116),button,torso)
  if look==0:rings('Belt',[(.072,.153,.11,0),(.108,.149,.11,0)],detail,torso)
 else:
  rings('Dress bodice',[(0,.158,.104,0),(.13,.126,.088,0),(.29,.17,.108,0),(.39,.176,.093,0),(.418,.106,.073,0)],fabric,torso)
  rings('A-line skirt',[(-.43,.252,.168,0),(-.26,.218,.145,0),(-.12,.184,.116,0),(0,.16,.103,0),(.09,.133,.094,0)],fabric,hip)
  rings('Waist seam',[(.087,.135,.098,0),(.104,.132,.096,0)],detail,torso)
 limbs=[]
 for side in [-1,1]:
  a=node('Arm L' if side<0 else 'Arm R',torso,(side*.186,.365,0),rot=quat(0,side*.12));elbow=node('Elbow '+str(side),a,(0,-.235,0));
  rings('Upper arm',[(-.23,.039,.04,0),(-.11,.047,.045,0),(-.015,.056,.048,0),(.025,.04,.039,0)],fabric if look<2 else white,a)
  rings('Forearm',[(-.205,.028,.029,0),(-.10,.038,.038,0),(0,.039,.037,0)],fabric if look<2 else white,elbow)
  sphere('Hand',(.034,.065,.025),(0,-.248,.003),white,elbow)
  leg=node('Hip '+str(side),hip,(side*.082,-.04,0)); knee=node('Knee '+str(side),leg,(0,-.395,0));foot=node('Ankle '+str(side),knee,(0,-.39,0));
  lm=fabric if look<2 else white
  rings('Thigh',[(-.39,.046,.049,0),(-.25,.065,.065,0),(-.05,.083,.077,0),(.03,.065,.068,0)],lm,leg)
  rings('Shin',[(-.39,.035,.035,0),(-.24,.049,.05,0),(-.04,.052,.054,0),(.02,.046,.049,0)],lm,knee)
  sphere('Shoe',(.051,.043,.099),(0,-.045,.043),dark,foot);limbs.append((side,a,elbow,leg,knee,foot))
 times=np.linspace(0,1.4,33);ti=accessor(times,'SCALAR',5126)
 def animate(i,path,values,typ):
  ai=accessor(values,typ,5126);samplers.append({'input':ti,'output':ai,'interpolation':'LINEAR'});channels.append({'sampler':len(samplers)-1,'target':{'node':i,'path':path}})
 animate(hip,'translation',[(0,.94+.012*(1-math.cos(4*math.pi*t/1.4)),0) for t in times],'VEC3')
 animate(torso,'rotation',[quat(0,.018*math.sin(2*math.pi*t/1.4)) for t in times],'VEC4')
 for s,a,e,l,k,f in limbs:
  phase=2*np.pi*times/1.4+(0 if s==1 else np.pi); amplitude=.16 if look==2 else .26
  for i,vals in [(a,[quat(-.23*math.sin(p),s*.12) for p in phase]),(e,[quat(-.12-.10*max(0,math.cos(p))) for p in phase]),(l,[quat(amplitude*math.sin(p)) for p in phase]),(k,[quat(.40*max(0,-math.cos(p))) for p in phase]),(f,[quat(-.14*max(0,-math.cos(p))) for p in phase])]:animate(i,'rotation',vals,'VEC4')
 while len(b)%4:b.append(0)
 gltf={'asset':{'version':'2.0','generator':'FORM original procedural sample'},'scene':0,'scenes':[{'nodes':[root]}],'nodes':nodes,'meshes':meshes,'materials':mats,'animations':[{'name':'Walk','channels':channels,'samplers':samplers}],'buffers':[{'byteLength':len(b)}],'bufferViews':views,'accessors':acc}
 j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4);file=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(b))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(b),b'BIN\0')+b
 out=ROOT/'public'/'models'/f'look-0{look+1}.glb';out.write_bytes(file);print(out.name,len(file))
for i in range(3):make(i)
