(() => {
  'use strict';
  const container = document.querySelector('#sculpture');
  const canvas = document.querySelector('#sculpture-canvas');
  if (!container || !canvas || !globalThis.MetznerGeometry) return;
  const render = container.querySelector('.sculpture-render');
  const cursor = container.querySelector('.sculpture-cursor');
  const toggle = document.querySelector('#motion-toggle');
  const rotateButton = document.querySelector('#rotate-form');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mesh = MetznerGeometry.build(innerWidth <= 600 ? 120 : 180, innerWidth <= 600 ? 26 : 32);
  const gpu = globalThis.MetznerRenderer?.create(canvas,mesh);
  if (gpu?.failed) return;
  const context = gpu ? null : canvas.getContext('2d', { alpha:true });
  if (!gpu && !context) return;
  let paused = reduced.matches, visible = true, frame = 0, lastTime = 0, contextLost = false;
  let rotation = 0, targetRotation = 0, pitch = -0.48, targetPitch = -0.48;
  const hover = [0, 0, 0], targetHover = [0, 0, 0];
  let dragging = false, lastX = 0, lastY = 0, width = 700, height = 700, dpr = 1;
  const resetHover = () => {
    targetHover.fill(0);
    container.classList.remove('pointer-active');
    if (!paused) schedule();
  };

  const updateControl = () => {
    const label = paused ? 'Bewegung aktivieren' : 'Bewegung pausieren';
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.querySelector('span').textContent = paused ? '▷' : 'Ⅱ';
    container.classList.toggle('motion-paused', paused);
  };
  function draw() {
    if(contextLost)return;
    if (gpu) {
      gpu.draw(.25+rotation+hover[0],pitch+hover[1],-.22+hover[2],hover[0],hover[1]);
      container.classList.add('is-live');
      return;
    }
    context.clearRect(0,0,width,height);
    const size = Math.min(width, height);
    context.save();
    context.translate((width-size)/2,(height-size)/2);
    const faces = MetznerGeometry.project(mesh, .25+rotation+hover[0], pitch+hover[1], -.22+hover[2], size);
    context.lineJoin = 'round';
    for (const face of faces) {
      context.beginPath();
      context.moveTo(face.points[0][0],face.points[0][1]);
      for (let i=1;i<4;i++) context.lineTo(face.points[i][0],face.points[i][1]);
      context.closePath();
      context.fillStyle=face.fill;
      context.fill();
      context.strokeStyle=face.fill;
      context.lineWidth=.6;
      context.stroke();
      // Fine cross sections give the form the tactility of folded technical paper.
      context.beginPath();
      context.moveTo(face.points[0][0],face.points[0][1]);
      context.lineTo(face.points[3][0],face.points[3][1]);
      context.strokeStyle='rgba(177,198,255,.30)';
      context.lineWidth=.55;
      context.stroke();
    }
    context.restore();
    container.classList.add('is-live');
  }
  function tick(time) {
    frame = 0;
    if (contextLost || !visible || document.hidden) return;
    const delta = lastTime ? Math.min(time-lastTime,70) : 33;
    if (delta < 31) { frame=requestAnimationFrame(tick); return; }
    lastTime=time;
    const ease = reduced.matches ? 1 : 1-Math.exp(-delta/145);
    rotation += (targetRotation-rotation)*ease;
    pitch += (targetPitch-pitch)*ease;
    hover.forEach((value,index)=>{hover[index]+=(targetHover[index]-value)*ease;});
    const unsettled = Math.abs(targetRotation-rotation)+Math.abs(targetPitch-pitch)+hover.reduce((sum,value,index)=>sum+Math.abs(targetHover[index]-value),0)>.0005;
    if(!unsettled){rotation=targetRotation;pitch=targetPitch;hover.forEach((_,index)=>{hover[index]=targetHover[index];});}
    draw();
    if (unsettled) frame=requestAnimationFrame(tick);
  }
  function schedule() { if (!contextLost && !frame && visible && !document.hidden) { lastTime=0; frame=requestAnimationFrame(tick); } }
  function resize() {
    if(contextLost)return;
    const rect=render.getBoundingClientRect();
    width=rect.width; height=rect.height; dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    if(gpu)gpu.resize(width,height);else context.setTransform(dpr,0,0,dpr,0,0);
    draw();schedule();
  }
  const setPaused = value => {
    paused=value;
    if(paused){
      dragging=false;targetRotation=rotation;targetPitch=pitch;
      hover.forEach((value,index)=>{targetHover[index]=value;});
      cancelAnimationFrame(frame);frame=0;
      container.classList.remove('pointer-active');
    }else resetHover();
    updateControl();
  };
  toggle.addEventListener('click',()=>setPaused(!paused));
  rotateButton.addEventListener('click',()=>{targetRotation+=Math.PI/4;schedule();});
  reduced.addEventListener('change',event=>setPaused(event.matches));
  finePointer.addEventListener('change',resetHover);
  render.addEventListener('pointerdown', event=>{
    if (paused || !finePointer.matches || event.pointerType==='touch') return;
    dragging=true;lastX=event.clientX;lastY=event.clientY;
    render.setPointerCapture(event.pointerId);schedule();
  });
  const followPointer = event=>{
    if (paused || !finePointer.matches || event.pointerType==='touch') return;
    const rect=container.getBoundingClientRect();
    cursor.style.transform=`translate(${event.clientX-rect.left-32}px,${event.clientY-rect.top-32}px)`;
    container.classList.add('pointer-active');
    if (dragging) {
      targetRotation+=(event.clientX-lastX)*.008;
      targetPitch=Math.max(-1.1,Math.min(.8,targetPitch+(event.clientY-lastY)*.005));
      lastX=event.clientX;lastY=event.clientY;schedule();
    }else{
      const bounds=render.getBoundingClientRect();
      const x=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
      const y=Math.max(-1,Math.min(1,(event.clientY-bounds.top)/bounds.height*2-1));
      targetHover[0]=x*.52;targetHover[1]=y*.22;targetHover[2]=x*.045;
      schedule();
    }
  };
  render.addEventListener('pointerenter',followPointer);
  render.addEventListener('pointermove',followPointer);
  const endDrag=()=>{dragging=false;schedule();};
  render.addEventListener('pointerup',endDrag);
  render.addEventListener('pointercancel',endDrag);
  render.addEventListener('lostpointercapture',()=>{dragging=false;});
  render.addEventListener('pointerleave',resetHover);
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;visible=false;
    container.classList.remove('is-live','pointer-active');
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;dragging=false;resetHover();}else schedule();});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;dragging=false;resetHover();}
  },{rootMargin:'60px'}).observe(container);
  new ResizeObserver(resize).observe(render);
  updateControl();
})();
