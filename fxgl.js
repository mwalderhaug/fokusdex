'use strict';
/* Fokusdex – etterbehandling og materialer i WebGL for raidfilmene og arenaene (verktøykassa, del 1).
   Bildet tegnes som før med Canvas 2D på et lerret på 512 × 384 (raid.js). Her går det gjennom grafikkortet før det vises:
   1. Scenen: kameraet (zoom, rulling, risting), forvrengningene (varmeflimmer, sjokkbølger, bule og klem, et forvrengningskart, bølgende rader) og
      MATERIALET under bildet. Der 2D-bildet er gjennomsiktig, tegnes bakken av en shader: lava, hav eller is, i ekte perspektiv (FXGL.mat).
   2. Gløden: de lyseste delene blør ut i to størrelser. Lysstråler: de lyse delene strekkes ut fra et punkt.
   3. Finishen: fargetone, sepia og gammel film, negativ, treffbildet i svart og hvitt, korn, vignett, digitale forstyrrelser, smelting, blink, toning, bånd.
   Alt styres av feltene i P (kameraet til bildet, se newP i raid.js). Ett felles WebGL-lerret brukes for alt og kopieres til lerretet som vises, så
   nettleseren bare trenger én kontekst. Mangler WebGL, eller går konteksten tapt, tegner raid.js en enklere versjon i Canvas 2D (present2).
   Shaderne er skrevet her, uten kode fra andre. */
const FXGL = (() => {
  const G = { err: '', on: false, n: 0 }, W = 512, H = 384;
  let cv = null, gl = null, lost = false, tried = false, quad = null, RS = 1;
  const progs = {}, mats = {}, tex = {}, fbo = {};
  const HEAD = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
const vec2 R=vec2(512.,384.);
const vec3 LUM=vec3(.299,.587,.114);
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 h22(vec2 p){float n=h21(p);return vec2(n,h21(p+n+17.13));}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.3,9.1);a*=.5;}return s;}
`;
  const VS = 'attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x,1.-a.y);gl_Position=vec4(a.x*2.-1.,1.-a.y*2.,0.,1.);}';
  /* ---------- Scenen ----------
     uCam = (zx, zy, zoom, rulling) · uSh = risting · uHeat = (styrke i piksler, midtlinje y, rekkevidde opp, rekkevidde ned) · uHm = 1 når varmekartet (uK) brukes
     uShock[i] = (x, y, radius, bredde), uShB[i] = (styrke i piksler, flattrykking i y) · uBulge = (x, y, radius, styrke: + bule, − klem)
     uWarp = (styrke i piksler, 0 = på linsa / 1 = i bildet) med kartet uD (rødt og grønt rundt 0,5) · uWav = bølgende rader · uRgb = fargesplitt
     Bakken (materialet): uG = (forsvinningspunkt x, horisont y, brennvidde, kamerahøyde), uGC = (kamera X, kamera Z, tid, 0), uM[0..5] = materialets egne tall. */
  const SCENE = `uniform sampler2D uS,uK,uD;
uniform vec4 uCam,uHeat,uBulge,uG,uGC;uniform vec2 uSh,uWarp;uniform float uT,uWav,uRgb,uHm;
uniform vec4 uShock[4];uniform vec2 uShB[4];uniform vec4 uM[6];
vec4 scn(vec2 s){return texture2D(uS,vec2(s.x/R.x,1.-s.y/R.y));}
/* Bakken sett fra kameraet: xy = stedet på bakken (verdensenheter), z = avstanden fra kameraet, w = hvor mye bakke én piksel dekker i dybden. */
vec4 gnd(vec2 s){float dy=max(s.y-uG.y,.6);float zr=uG.z*uG.w/dy;return vec4(uGC.x+(s.x-uG.x)*zr/uG.z,uGC.y+zr,zr,zr*zr/(uG.z*uG.w));}
vec3 voro(vec2 p){vec2 i=floor(p),f=fract(p);float a=8.,b=8.,id=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 r=g+h22(i+g)-f;float d=dot(r,r);if(d<a){b=a;a=d;id=h21(i+g+3.7);}else if(d<b)b=d;}return vec3(sqrt(a),sqrt(b),id);}
/* Ringer som brer seg over bakken (uM[3..5] = X, Z, radius, styrke): steg, nedslag og bølger, i samme perspektiv som bakken. */
float rings(vec2 w,float wd){float r=0.;for(int i=3;i<6;i++){vec4 q=uM[i];if(q.w>0.){float k=(length(w-q.xy)-q.z)/wd;r+=q.w*exp(-k*k);}}return r;}
//MAT
void main(){
  vec2 p=vec2(v.x*R.x,(1.-v.y)*R.y);
  vec2 q=p-uCam.xy-uSh;float cr=cos(uCam.w),sr=sin(uCam.w);q=vec2(q.x*cr+q.y*sr,-q.x*sr+q.y*cr)/uCam.z+uCam.xy;
  vec2 d=vec2(0.);
  for(int i=0;i<4;i++){if(uShB[i].x!=0.){vec2 dv=q-uShock[i].xy;dv.y/=uShB[i].y;float L=length(dv)+.001;float k=(L-uShock[i].z)/uShock[i].w;d+=dv/L*uShB[i].x*exp(-k*k)*vec2(1.,uShB[i].y);}}
  if(uBulge.w!=0.){vec2 dv=q-uBulge.xy;float L=length(dv)/uBulge.z;if(L<1.){float k=1.-L;d-=dv*k*k*uBulge.w;}}
  if(uHeat.x>0.){float dy=q.y-uHeat.y;float m=dy<0.?exp(dy/uHeat.z):exp(-dy/uHeat.w);if(uHm>.5)m=max(m*.35,texture2D(uK,vec2(q.x/R.x,1.-q.y/R.y)).r);
    vec2 n=vec2(vn(vec2(q.x*.055,q.y*.1+uT*2.3)),vn(vec2(q.x*.05+31.,q.y*.12+uT*2.7)))-.5;n+=(vec2(vn(vec2(q.x*.16,q.y*.3+uT*4.1)),vn(vec2(q.x*.15+9.,q.y*.33+uT*4.6)))-.5)*.45;d+=n*uHeat.x*m*vec2(1.,.6);}
  if(uWarp.x!=0.){vec2 wp=uWarp.y>.5?q:p;d+=(texture2D(uD,vec2(wp.x/R.x,1.-wp.y/R.y)).rg-.5)*2.*uWarp.x;}
  if(uWav!=0.)d.x+=sin(q.y*.045+uT*7.)*uWav;
  vec2 s=q+d;vec4 c=scn(s);
  if(uRgb>0.){c.r=scn(s-vec2(uRgb,0.)).r;c.b=scn(s+vec2(uRgb,0.)).b;}
#ifdef MAT
  if(c.a<.996)c.rgb+=mat(s)*(1.-c.a);
#endif
  gl_FragColor=vec4(c.rgb,1.);
}`;
  /* ---------- Materialene ---------- Hvert materiale er en funksjon mat(s) som gir fargen på bakken i punktet s på skjermen. */
  /* LAVA: skorpeflak som driver sakte, med glødende sprekker mellom, finere sprekker inni, og åpne renner av smeltet stein der det er varmest.
     uM[0] = (varme 0–2, fart, flakstørrelse, sprekkbredde) · uM[1] = (lysstyrke, glød langs horisonten, lysstyrke nærmest kameraet, 0) · uM[2] = (disfarge rgb, tetthet). */
  mats.lava = `vec3 ramp(float x){vec3 c=vec3(.028,.006,.002);c=mix(c,vec3(.4,.028,.0),smoothstep(0.,.3,x));c=mix(c,vec3(.98,.24,.02),smoothstep(.24,.6,x));c=mix(c,vec3(1.,.66,.14),smoothstep(.56,.92,x));return mix(c,vec3(1.,.95,.72),smoothstep(.9,1.35,x));}
vec3 mat(vec2 s){
  vec4 g=gnd(s);vec2 w=g.xy;float t=uGC.z,heat=uM[0].x,sp=uM[0].y,cell=uM[0].z;
  vec2 p=w/cell;
  vec2 fl=vec2(fbm(p*.33+vec2(0.,t*.02*sp)),fbm(p*.33+vec2(5.2,-t*.017*sp)))-.5;
  vec2 wg=(vec2(vn(p*3.7+2.),vn(p*3.7+9.))-.5)*.24;
  vec2 pp=p+fl*1.25+wg+vec2(t*.01,t*.026)*sp;
  vec3 V=voro(pp);float e=V.y-V.x;
  float mf=fbm(p*.2+vec2(t*.012,-t*.009)*sp+7.);
  float open=smoothstep(.67-.14*heat,.78-.14*heat,mf);
  float px=g.w/cell;
  float cw=max(uM[0].w*(.5+1.*vn(pp*2.1+V.z*7.))*(1.+.55*heat),1.3*px);
  float core=1.-smoothstep(0.,cw*.42,e),body=1.-smoothstep(cw*.3,cw*1.15,e),halo=1.-smoothstep(cw,cw*6.,e);
  vec3 V2=voro(pp*2.7+11.);float e2=V2.y-V2.x;float f2=(1.-smoothstep(0.,max(cw*.9,2.6*px),e2))*(1.-clamp(px/.1,0.,1.));
  vec3 V3=voro(pp*6.9+3.);float f3=(1.-smoothstep(0.,max(cw*1.1,6.*px),V3.y-V3.x))*(1.-clamp(px/.04,0.,1.));
  float tx=fbm(pp*6.+V.z*20.),rope=abs(sin(fbm(pp*3.+V.z*9.)*14.+pp.x*2.));
  vec3 crust=(vec3(.04,.028,.028)+vec3(.05,.034,.03)*tx+vec3(.026,.012,.004)*V.z)*(.74+.26*rope)*(.55+.45*smoothstep(cw,cw*2.6,e));
  float pulse=.84+.16*sin(t*1.7+V.z*40.+p.x);
  float temp=core*(.86+.16*heat)+body*(.46+.17*heat)*pulse+halo*(.09+.08*heat);
  temp=max(temp,f2*(.42+.2*heat)*(.6+.4*V2.z));temp=max(temp,f3*(.2+.16*heat));
  float skin=fbm(pp*2.3+vec2(t*.085,t*.05)*sp);
  float pool=open*(.42+.38*skin+.12*heat)*(1.-.62*smoothstep(.45,.7,fbm(pp*5.+vec2(t*.04,-t*.03))));
  temp=max(temp,pool);
  temp+=rings(w,cell*.16)*(.3+.7*max(max(body,f2),open));
  vec3 c=crust*(1.-open*.8)+ramp(temp)*uM[1].x*mix(uM[1].z,1.,smoothstep(30.,280.,g.z));
  float lod=clamp(g.w/(cell*.42),0.,1.);
  vec3 far=ramp(.12+.4*min(heat,1.2)+.08*vn(vec2(w.x/190.+t*.03,g.z/600.)))*uM[1].x;
  c=mix(c,far,lod*lod);
  c+=ramp(.28+.34*min(heat,1.2))*uM[1].y*exp(-(s.y-uG.y)/7.);
  float hz=1.-exp(-g.z*uM[2].w);
  return mix(c,uM[2].rgb,hz*.7);
}`;
  /* HAV: dønninger som ruller mot kameraet, himmelen speilet i overflaten (med lyn og lys), skum på toppene og ringer etter regnet.
     uM[0] = (dønning, krapp sjø, skum, regn 0–1) · uM[1] = (dypfarge rgb, speiling 0–1) · uM[2] = (disfarge rgb, tetthet). */
  mats.water = `float wh(vec2 w,float t){float h=sin(w.y*.012+t*.9+sin(w.x*.004+t*.2)*1.5);h+=sin(w.y*.031-t*1.3+w.x*.011)*.45;h+=sin(w.x*.05+w.y*.043+t*1.9)*.22;return h+(fbm(w*.035+vec2(t*.3,t*.5))-.5)*uM[0].y*1.4;}
vec3 mat(vec2 s){
  vec4 g=gnd(s);vec2 w=g.xy;float t=uGC.z,dy=max(s.y-uG.y,.6);
  float h=wh(w,t),hx=wh(w+vec2(4.,0.),t),hz=wh(w+vec2(0.,4.),t);
  vec2 n=vec2(h-hx,h-hz)*uM[0].x*6.;
  float fr=clamp(1.-dy/250.,0.,1.);fr=.22+.78*fr*fr;
  vec2 ms=vec2(s.x+n.x*20.,uG.y-dy*.85-1.5+n.y*16.);ms.y=min(ms.y,uG.y-1.);
  vec3 sky=scn(ms).rgb;
  vec3 deep=uM[1].rgb*(.6+.22*h*uM[0].x);
  vec3 c=mix(deep,sky,fr*uM[1].a);
  c+=vec3(.5,.62,.7)*pow(max(0.,n.y*.5+.18),3.)*fr;
  float cr=smoothstep(.95,1.5,h*uM[0].x+(fbm(w*.09+vec2(t*.4,t*.2))-.5)*1.1)*uM[0].z;
  c=mix(c,vec3(.86,.93,1.),clamp(cr,0.,1.));
  if(uM[0].w>0.){vec2 gp=w/26.;vec2 ci=floor(gp);vec2 o=h22(ci);float ph=fract(t*(.7+o.x*.5)+o.y);float rr=length(fract(gp)-.5-(o-.5)*.5);float ring=exp(-pow((rr-ph*.45)/.035,2.))*(1.-ph)*step(o.x,uM[0].w);c+=vec3(.7,.8,.9)*ring*.45*(1.-clamp(g.w/8.,0.,1.));}
  c+=vec3(.75,.88,1.)*rings(w,9.)*.6;
  float lod=clamp(g.w/40.,0.,1.);c=mix(c,mix(deep,sky,.6*uM[1].a),lod*.7);
  float hzf=1.-exp(-g.z*uM[2].w);
  return mix(c,uM[2].rgb,hzf*.8);
}`;
  /* IS: en frossen flate som speiler himmelen uskarpt, med rim, snøfonner og fine sprekker. En sprekk-stjerne kan slå ut fra et punkt.
     uM[0] = (speiling, rim, sprekker, blankhet) · uM[1] = (isfarge rgb, 0) · uM[2] = (disfarge rgb, tetthet) · uM[3] = (X, Z, radius, styrke) for sprekk-stjernen. */
  mats.ice = `vec3 mat(vec2 s){
  vec4 g=gnd(s);vec2 w=g.xy;float dy=max(s.y-uG.y,.6);
  vec2 jit=(vec2(vn(w*.05),vn(w*.05+9.))-.5)*5.;
  vec3 sky=vec3(0.);for(int i=0;i<4;i++){float k=float(i)-1.5;sky+=scn(vec2(s.x+jit.x+k*2.5,min(uG.y-dy*.9-1.5+jit.y+k*3.,uG.y-1.))).rgb;}sky*=.25;
  float fr=clamp(1.-dy/260.,0.,1.);fr=.3+.7*fr;
  vec3 c=mix(uM[1].rgb,sky,fr*uM[0].x);
  float rime=smoothstep(.5,.78,fbm(w*.018+3.))*uM[0].y;
  c=mix(c,vec3(.9,.95,1.),rime*.75);
  vec3 V=voro(w/70.+(vec2(vn(w*.02),vn(w*.02+4.))-.5)*.6);float e=V.y-V.x;
  float lod=1.-clamp(g.w/20.,0.,1.);
  c+=vec3(.75,.9,1.)*(1.-smoothstep(0.,.035,e))*uM[0].z*.5*lod;
  vec4 st=uM[3];if(st.w>0.){vec2 dv=w-st.xy;float L=length(dv),an=atan(dv.y,dv.x);float ray=pow(abs(sin(an*3.5+vn(vec2(L*.05,an*2.))*2.5)),40.);float inr=1.-smoothstep(st.z*.9,st.z,L);c+=vec3(.9,.97,1.)*(ray*inr+exp(-L*L/90.))*st.w*lod;}
  c+=vec3(.6,.75,.9)*uM[0].w*pow(max(0.,1.-abs(dy-46.)/60.),3.)*.12;
  float hz=1.-exp(-g.z*uM[2].w);
  return mix(c,uM[2].rgb,hz*.8);
}`;
  /* ---------- Gløden, lysstrålene og finishen ---------- */
  const BRIGHT = 'uniform sampler2D uS;uniform vec2 uB;void main(){vec2 d=vec2(.5/512.,.5/384.);vec3 c=(texture2D(uS,v+d).rgb+texture2D(uS,v-d).rgb+texture2D(uS,v+vec2(d.x,-d.y)).rgb+texture2D(uS,v+vec2(-d.x,d.y)).rgb)*.25;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(uB.x,uB.x+uB.y,l),1.);}';
  const BLUR = 'uniform sampler2D uS;uniform vec2 uD;void main(){vec3 c=texture2D(uS,v).rgb*.227;c+=(texture2D(uS,v+uD*1.385).rgb+texture2D(uS,v-uD*1.385).rgb)*.316;c+=(texture2D(uS,v+uD*3.231).rgb+texture2D(uS,v-uD*3.231).rgb)*.0703;gl_FragColor=vec4(c,1.);}';
  const RAYS = 'uniform sampler2D uS;uniform vec4 uR;void main(){vec2 c=vec2(uR.x/R.x,1.-uR.y/R.y);vec2 d=(v-c)*uR.z/20.;vec3 a=vec3(0.);vec2 p=v;float w=1.;for(int i=0;i<20;i++){a+=texture2D(uS,p).rgb*w;p-=d;w*=.94;}gl_FragColor=vec4(a*.085,1.);}';
  /* uTint = (farge ganges inn, metning) · uLift = (farge legges til, kontrast) · uMono = (styrke, terskel) · uVig = (farge, styrke) · uFl og uFade = (farge, styrke)
     uFx = (digitale forstyrrelser, linjer, smelting, gammel film) · uGr = (korn, lysstyrke, sepia, negativ) · uBl = (glød, lysstråler, bånd, bildenummer). */
  const FINAL = `uniform sampler2D uA,uB1,uB2,uRy;uniform vec4 uTint,uLift,uVig,uFl,uFade,uFx,uGr,uBl;uniform vec2 uMono;uniform float uT;
void main(){
  vec2 uv=v;float fr=uBl.w,ts=floor(uT*14.);vec2 px=vec2(v.x*R.x,(1.-v.y)*R.y);float sp=0.;
  if(uFx.x>0.){float bh=5.+h21(vec2(ts,1.))*30.;float b=floor(px.y/bh);float r=h21(vec2(b,ts));if(r<uFx.x*.6){uv.x+=(h21(vec2(b*3.1,ts+7.))-.5)*.5*uFx.x;sp=.012*uFx.x;}
    vec2 bl=floor(px/vec2(64.,48.));if(h21(bl+ts*1.7)<uFx.x*.12)uv+=(h22(bl+ts)-.5)*.2;}
  if(uFx.z>0.){float col=floor(px.x/2.);float sl=floor(uT*3.);float y0=h21(vec2(col,sl))*R.y;float L=pow(h21(vec2(col*1.7,sl+3.)),3.)*260.*uFx.z;if(h21(vec2(col*.37,sl+9.))<uFx.z&&px.y>y0&&px.y<y0+L)uv.y=1.-y0/R.y;}
  if(uFx.w>0.)uv+=(vec2(h21(vec2(ts,3.)),h21(vec2(ts,5.)))-.5)*.004*uFx.w;
  vec3 c=texture2D(uA,uv).rgb;
  if(sp>0.){c.r=texture2D(uA,uv+vec2(sp,0.)).r;c.b=texture2D(uA,uv-vec2(sp,0.)).b;}
  if(uBl.x>0.)c+=(texture2D(uB1,uv).rgb+texture2D(uB2,uv).rgb*1.2)*uBl.x;
  if(uBl.y>0.)c+=texture2D(uRy,uv).rgb*uBl.y;
  c*=uGr.y;float l=dot(c,LUM);
  c=mix(vec3(l),c,uTint.a)*uTint.rgb+uLift.rgb;c=(c-.5)*uLift.a+.5;
  if(uGr.z>0.)c=mix(c,l*vec3(1.08,.9,.68),uGr.z);
  if(uFx.w>0.){c=mix(c,dot(c,LUM)*vec3(1.06,.92,.74),uFx.w);c*=1.+(h21(vec2(floor(uT*24.),2.))-.5)*.2*uFx.w;float sx=h21(vec2(floor(uT*9.),4.))*R.x;c+=vec3(.5)*uFx.w*step(abs(px.x-sx),.6)*step(.5,h21(vec2(floor(px.y/60.),floor(uT*9.))));}
  if(uGr.w>0.)c=mix(c,1.-c,uGr.w);
  if(uMono.x>0.)c=mix(c,vec3(step(uMono.y,dot(c,LUM))),uMono.x);
  if(uGr.x>0.)c+=(h21(px+fr*7.13)-.5)*uGr.x;
  if(uFx.y>0.)c*=1.-uFx.y*step(.5,fract(px.y*.25));
  if(uVig.a>0.){float d=length((v-.5)*vec2(1.,.82));c=mix(c,uVig.rgb,uVig.a*smoothstep(.3,.82,d));}
  c=mix(c,uFl.rgb,uFl.a);
  if(uBl.z>0.){float b=floor(34.*uBl.z+.5);if(px.y<b||px.y>R.y-b)c=vec3(0.);}
  c=mix(c,uFade.rgb,uFade.a);
  gl_FragColor=vec4(c,1.);
}`;

  function prog(key, fs) {
    if (progs[key]) return progs[key];
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(key + ': ' + (gl.getShaderInfoLog(s) || 'shader')); return s; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, HEAD + fs)); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(key + ': ' + (gl.getProgramInfoLog(p) || 'link'));
    const U = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i), nm = u.name.replace(/\[0\]$/, ''); U[nm] = gl.getUniformLocation(p, u.name); }
    return (progs[key] = { p, U });
  }
  const mkTex = (w, h, lin) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); const f = lin === 0 ? gl.NEAREST : gl.LINEAR; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const mkFbo = (w, h) => { const t = mkTex(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { f, t, w, h }; };
  function init() {
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const k of Object.keys(progs)) delete progs[k];
    tex.s = mkTex(0, 0); tex.k = mkTex(0, 0); tex.d = mkTex(0, 0); tex.kv = tex.dv = -1;
    fbo.a = mkFbo(W * RS, H * RS); fbo.b = mkFbo(W / 2, H / 2); fbo.c = mkFbo(W / 4, H / 4); fbo.d = mkFbo(W / 4, H / 4); fbo.e = mkFbo(W / 8, H / 8); fbo.f = mkFbo(W / 8, H / 8); fbo.r = mkFbo(W / 4, H / 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    prog('bright', BRIGHT); prog('blur', BLUR); prog('rays', RAYS); prog('final', FINAL); prog('scene', SCENE);
  }
  /* Finnes WebGL? Lerretet og konteksten lages første gang det spørres. */
  G.ok = () => {
    if (tried) return !!gl && !lost;
    tried = true; if (typeof window !== 'undefined' && window.FXGL_OFF) return false;
    try {
      cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      if (!gl) throw new Error('no webgl');
      init();
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; G.on = false; });
      cv.addEventListener('webglcontextrestored', () => { try { init(); lost = false; } catch (e) { G.err = String(e && e.message || e); gl = null; } });
    } catch (e) { G.err = String(e && e.message || e); gl = null; }
    return !!gl;
  };
  /* Et eget materiale (til de aller sjeldneste, som får shadere ingen andre har): glsl definerer vec3 mat(vec2 s). */
  G.mat = (name, glsl) => { mats[name] = glsl; delete progs['scene:' + name]; };
  G.has = name => !!mats[name];
  const col = (c, a) => { if (typeof c !== 'string') return [c[0], c[1], c[2], a]; let h = c.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, a]; };
  const up = (t, src) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };
  const pass = (pg, target, binds) => { gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null); gl.viewport(0, 0, target ? target.w : cv.width, target ? target.h : cv.height); binds.forEach((b, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, b[1]); gl.uniform1i(pg.U[b[0]], i); }); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const Z4 = [0, 0, 0, 0];
  /* Tegner bildet src (2D-lerretet) gjennom kjeden og kopierer resultatet til out (2D-lerret). P = kameraet og effektene, T = tiden, fno = bildenummeret.
     Gir false hvis det ikke gikk (da tegner den som kaller, reserven). */
  G.draw = (out, src, P, T, fno, shx, shy) => {
    if (!G.ok()) return false;
    try {
      /* Oppløsningen følger bildet som kommer inn (512 × 384 ganger 1, 1,5 eller 2). Gløden regnes alltid i samme lave oppløsning. */
      const rs = src.width / W; if (rs !== RS) { RS = rs; cv.width = W * rs; cv.height = H * rs; gl.deleteFramebuffer(fbo.a.f); gl.deleteTexture(fbo.a.t); fbo.a = mkFbo(W * rs, H * rs); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      const m = P.mat && mats[P.mat.k] ? P.mat : null, sc = m ? prog('scene:' + m.k, '#define MAT\n' + SCENE.replace('//MAT', mats[m.k])) : prog('scene', SCENE);
      up(tex.s, src);
      const hm = P.heat > 0 && P.heatMask ? P.heatMask : null; if (hm && tex.kv !== (hm._v || 0)) { up(tex.k, hm); tex.kv = hm._v || 0; }
      const wm = P.warp && P.warp.map ? P.warp.map : null; if (wm && (tex.dv !== (wm._v || 0) || tex.dsrc !== wm)) { up(tex.d, wm); tex.dv = wm._v || 0; tex.dsrc = wm; }
      gl.useProgram(sc.p); const U = sc.U;
      gl.uniform4f(U.uCam, P.zx, P.zy, P.z, P.rot || 0); gl.uniform2f(U.uSh, shx || 0, shy || 0); gl.uniform1f(U.uT, T % 4000); gl.uniform1f(U.uWav, P.wav || 0); gl.uniform1f(U.uRgb, P.rgb || 0);
      gl.uniform4f(U.uHeat, P.heat || 0, P.heatY == null ? 150 : P.heatY, P.heatUp || 90, P.heatDn || 120); gl.uniform1f(U.uHm, hm ? 1 : 0);
      const sk = P.shock || [], S4 = new Float32Array(16), SB = new Float32Array(8);
      for (let i = 0; i < 4 && i < sk.length; i++) { const q = sk[i]; S4[i * 4] = q.x; S4[i * 4 + 1] = q.y; S4[i * 4 + 2] = q.r; S4[i * 4 + 3] = q.w || 22; SB[i * 2] = q.a || 0; SB[i * 2 + 1] = q.sy || 1; }
      gl.uniform4fv(U.uShock, S4); gl.uniform2fv(U.uShB, SB);
      const b = P.bulge; gl.uniform4f(U.uBulge, b ? b.x : 0, b ? b.y : 0, b ? b.r : 1, b ? b.a : 0);
      gl.uniform2f(U.uWarp, wm ? P.warp.a || 0 : 0, wm && P.warp.world ? 1 : 0);
      if (m) { const g = m.g || [256, 146, 400, 52], c = m.c || [0, 0]; gl.uniform4f(U.uG, g[0], g[1], g[2], g[3]); gl.uniform4f(U.uGC, c[0], c[1], (m.t == null ? T : m.t) % 4000, 0); const M = new Float32Array(24); (m.u || []).forEach((r, i) => { if (i < 6) for (let j = 0; j < 4; j++) M[i * 4 + j] = r[j] || 0; }); gl.uniform4fv(U.uM, M); }
      pass(sc, fbo.a, [['uS', tex.s], ['uK', tex.k], ['uD', tex.d]]);
      const bloom = P.bloom || 0, rays = P.rays && P.rays.a > 0 ? P.rays : null;
      if (bloom > 0 || rays) {
        let pg = prog('bright', BRIGHT); gl.useProgram(pg.p); gl.uniform2f(pg.U.uB, P.bloomT == null ? 0.62 : P.bloomT, 0.3); pass(pg, fbo.b, [['uS', fbo.a.t]]);
        pg = prog('blur', BLUR); gl.useProgram(pg.p);
        gl.uniform2f(pg.U.uD, 2 / W, 0); pass(pg, fbo.c, [['uS', fbo.b.t]]); gl.uniform2f(pg.U.uD, 0, 4 / H); pass(pg, fbo.d, [['uS', fbo.c.t]]);
        gl.uniform2f(pg.U.uD, 4 / W, 0); pass(pg, fbo.e, [['uS', fbo.d.t]]); gl.uniform2f(pg.U.uD, 0, 8 / H); pass(pg, fbo.f, [['uS', fbo.e.t]]);
        gl.uniform2f(pg.U.uD, 8 / W, 0); pass(pg, fbo.e, [['uS', fbo.f.t]]); gl.uniform2f(pg.U.uD, 0, 8 / H); pass(pg, fbo.f, [['uS', fbo.e.t]]);
        if (rays) { pg = prog('rays', RAYS); gl.useProgram(pg.p); gl.uniform4f(pg.U.uR, rays.x, rays.y, rays.len == null ? 0.9 : rays.len, 0); pass(pg, fbo.r, [['uS', fbo.d.t]]); }
      }
      const fp = prog('final', FINAL), F = fp.U; gl.useProgram(fp.p);
      const gr = P.grade || {}, ti = gr.tint ? col(gr.tint, gr.sat == null ? 1 : gr.sat) : [1, 1, 1, gr.sat == null ? 1 : gr.sat], li = gr.lift ? col(gr.lift, gr.con == null ? 1 : gr.con) : [0, 0, 0, gr.con == null ? 1 : gr.con];
      gl.uniform4fv(F.uTint, ti); gl.uniform4fv(F.uLift, li);
      gl.uniform2f(F.uMono, P.mono || 0, P.monoT == null ? 0.42 : P.monoT);
      gl.uniform4fv(F.uVig, P.vig > 0 ? col(P.vigc || '#000', P.vig) : Z4); gl.uniform4fv(F.uFl, P.fl > 0.004 ? col(P.fc || '#fff', Math.min(1, P.fl)) : Z4); gl.uniform4fv(F.uFade, P.fade > 0.004 ? col(P.fadec || '#000', Math.min(1, P.fade)) : Z4);
      gl.uniform4f(F.uFx, P.gl || 0, P.scan || 0, P.melt || 0, P.film || 0); gl.uniform4f(F.uGr, P.grain || 0, gr.exp == null ? 1 : gr.exp, gr.sepia || 0, P.inv || 0);
      gl.uniform4f(F.uBl, bloom, rays ? rays.a : 0, P.bars || 0, fno % 1000); gl.uniform1f(F.uT, T % 4000);
      pass(fp, null, [['uA', fbo.a.t], ['uB1', fbo.d.t], ['uB2', fbo.f.t], ['uRy', fbo.r.t]]);
      const o = out.getContext('2d'); o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'copy'; o.imageSmoothingEnabled = false; o.drawImage(cv, 0, 0, out.width, out.height); o.restore();
      G.on = true; G.n++; return true;
    } catch (e) { G.err = String(e && e.message || e); G.on = false; return false; }
  };
  return G;
})();
