/* Original parametric artwork. No renderer or external graphics dependency. */
(() => {
  const TAU = Math.PI * 2;
  const unit = a => { const length = Math.hypot(...a); return a.map(v => v / length); };
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const center = t => [(1.5 + 0.52*Math.cos(3*t))*Math.cos(2*t), (1.5 + 0.52*Math.cos(3*t))*Math.sin(2*t), 0.64*Math.sin(3*t)];
  function build(rings = 180, sides = 32) {
    const points = [], normals = [], faces = [];
    for (let i = 0; i < rings; i++) {
      const t = i / rings * TAU;
      const c = center(t), ahead = center(t + 0.001), behind = center(t - 0.001);
      const tangent = unit(ahead.map((v, k) => v - behind[k]));
      const normal = unit(cross(tangent, [0, 0, 1]));
      const binormal = cross(tangent, normal);
      for (let j = 0; j < sides; j++) {
        const angle = j / sides * TAU;
        const n = normal.map((v, k) => v * Math.cos(angle) + binormal[k] * Math.sin(angle));
        points.push(c.map((v, k) => v + n[k] * 0.36));
        normals.push(n);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = ((i+1) % rings)*sides + j;
      const c = ((i+1) % rings)*sides + (j+1)%sides, d = i*sides + (j+1)%sides;
      const normal = unit([0,1,2].map(k => normals[a][k]+normals[b][k]+normals[c][k]+normals[d][k]));
      faces.push({ indices:[a,b,c,d], normal, stripe:i % 2 });
    }
    return { points, normals, faces, rings, sides };
  }
  function project(mesh, yaw = 0.25, pitch = -0.48, roll = -0.22, size = 700) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch), cz = Math.cos(roll), sz = Math.sin(roll);
    const rotate = point => {
      let [x,y,z] = point;
      [x,z] = [x*cy+z*sy,-x*sy+z*cy];
      [y,z] = [y*cx-z*sx,y*sx+z*cx];
      return [x*cz-y*sz,x*sz+y*cz,z];
    };
    const rotated = mesh.points.map(rotate);
    const scale = size * 0.18;
    const vertices = rotated.map(([x,y,z]) => { const perspective = 8/(8-z); return [size/2+x*scale*perspective,size/2+y*scale*perspective,z]; });
    const faces = [];
    for (const face of mesh.faces) {
      const n = rotate(face.normal);
      if (n[2] < -0.1) continue;
      const light = Math.max(0, n[0]*-0.4+n[1]*-0.65+n[2]*0.64);
      const shine = Math.pow(Math.max(0,n[0]*-0.23+n[1]*-0.34+n[2]*0.91),18);
      const color = [15 + light*30 + shine*90, 34 + light*48 + shine*90, 130 + light*85 + shine*35].map(v=>Math.round(Math.min(255,v)));
      faces.push({points:face.indices.map(i=>vertices[i]),depth:face.indices.reduce((sum,i)=>sum+rotated[i][2],0)/4,fill:`rgb(${color.join(',')})`});
    }
    faces.sort((a,b)=>a.depth-b.depth);
    return faces;
  }
  globalThis.MetznerGeometry = { build, project };
})();
