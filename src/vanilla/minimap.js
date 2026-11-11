import {getActivePose,getActiveObstacles} from '../lib/go2-link.js';
export function miniMap(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)return()=>{};
 const draw=()=>{const dpr=devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const css=getComputedStyle(document.documentElement),color=(v,a=1)=>`hsl(${css.getPropertyValue(v)} / ${a})`;const pose=getActivePose()??{x:0,y:0,yaw:0},scale=w/8,toScreen=(x,y)=>[w/2+(x-pose.x)*scale,h/2-(y-pose.y)*scale];ctx.strokeStyle=color('--border',.6);ctx.lineWidth=1;
 for(let m=Math.floor(pose.x-8);m<=pose.x+8;m++){const [x]=toScreen(m,0);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let m=Math.floor(pose.y-8);m<=pose.y+8;m++){const [,y]=toScreen(0,m);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 ctx.fillStyle=color('--destructive',.85);for(const [x,y] of getActiveObstacles()){const [sx,sy]=toScreen(x,y);if(sx>=-4&&sy>=-4&&sx<=w+4&&sy<=h+4)ctx.fillRect(sx-2,sy-2,4,4);}
 ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-pose.yaw);ctx.fillStyle=color('--primary');ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,7);ctx.lineTo(-4,0);ctx.lineTo(-8,-7);ctx.closePath();ctx.fill();ctx.restore();};draw();const id=setInterval(draw,100);return()=>clearInterval(id);
}
