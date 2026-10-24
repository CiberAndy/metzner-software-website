/* Small native GPU renderer. Interpolated normals keep the sculptural surface smooth. */
(() => {
  function create(canvas, mesh) {
    const gl = canvas.getContext('webgl', {alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:false});
    if (!gl) return null;
    const vertex = `
      attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
      uniform vec3 angles; uniform vec2 aspect;
      varying vec3 vNormal; varying vec2 vUv;
      vec3 rotate(vec3 p) {
        float cy=cos(angles.x), sy=sin(angles.x), cx=cos(angles.y), sx=sin(angles.y), cz=cos(angles.z), sz=sin(angles.z);
        p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
        p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);
        return vec3(p.x*cz-p.y*sz,p.x*sz+p.y*cz,p.z);
      }
      void main(){
        vec3 p=rotate(position);float distance=8.0-p.z;
        gl_Position=vec4(p.x*2.88*aspect.x,-p.y*2.88*aspect.y,1.105263*distance-2.105263,distance);
        vNormal=rotate(normal);vUv=uv;
      }`;
    const fragment = `
      precision mediump float;
      uniform vec2 lightOffset;
      varying vec3 vNormal; varying vec2 vUv;
      void main(){
        vec3 n=normalize(vNormal);
        vec3 key=normalize(vec3(-0.4+lightOffset.x*0.2,-0.65+lightOffset.y*0.2,0.64));
        float diffuse=max(0.0,dot(n,key));
        float fill=max(0.0,dot(n,normalize(vec3(0.8,0.25,0.6))));
        float sheen=pow(max(0.0,dot(n,normalize(vec3(-0.35,-0.3,0.92)))),16.0);
        float shine=pow(max(0.0,dot(n,normalize(key+vec3(0.0,0.0,1.0)))),80.0);
        float rim=pow(1.0-abs(n.z),3.0);
        vec3 color=vec3(0.035,0.07,0.30)+diffuse*vec3(0.075,0.16,0.43)+fill*vec3(0.035,0.055,0.12)+sheen*vec3(0.16,0.22,0.27)+shine*vec3(0.32,0.36,0.37)+rim*vec3(0.035,0.065,0.12);
        float contour=smoothstep(0.46,0.495,abs(fract(vUv.x*120.0)-0.5));
        color+=contour*vec3(0.015,0.022,0.035);
        gl_FragColor=vec4(color,1.0);
      }`;
    const shaders=[];
    const compile = (type,source) => {
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);shaders.push(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Shader unavailable');
      return shader;
    };
    try {
      const program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('GPU program unavailable');
      gl.useProgram(program);
      shaders.forEach(shader=>gl.deleteShader(shader));
      const data=[];
      mesh.faces.forEach((face,index)=>{
        const ring=Math.floor(index/mesh.sides),side=index%mesh.sides;
        const uvs=[[ring/mesh.rings,side/mesh.sides],[(ring+1)/mesh.rings,side/mesh.sides],[(ring+1)/mesh.rings,(side+1)/mesh.sides],[ring/mesh.rings,(side+1)/mesh.sides]];
        for(const corner of [0,1,2,0,2,3])data.push(...mesh.points[face.indices[corner]],...mesh.normals[face.indices[corner]],...uvs[corner]);
      });
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
      for(const [name,length,offset] of [['position',3,0],['normal',3,12],['uv',2,24]]){
        const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,length,gl.FLOAT,false,32,offset);
      }
      const angles=gl.getUniformLocation(program,'angles'),aspect=gl.getUniformLocation(program,'aspect'),lightOffset=gl.getUniformLocation(program,'lightOffset');
      gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
      return {
        resize(width,height){gl.viewport(0,0,canvas.width,canvas.height);const size=Math.min(width,height);gl.uniform2f(aspect,size/width,size/height);},
        draw(yaw,pitch,roll,lightX=0,lightY=0){gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform3f(angles,yaw,pitch,roll);gl.uniform2f(lightOffset,lightX,lightY);gl.drawArrays(gl.TRIANGLES,0,data.length/8);},
      };
    } catch {
      return {failed:true}; // The accessible static artwork remains visible.
    }
  }
  globalThis.MetznerRenderer={create};
})();
