const deadzone=(v,d)=>Math.abs(v)<d?0:Math.sign(v)*(Math.abs(v)-d)/(1-d);
export function watchGamepad(listener) {
 let baseline=[0,0,0,0],connected=false,raf=0;
 const poll=()=>{
  const gp=[...(navigator.getGamepads?.()??[])].find(Boolean);
  if(gp){if(!connected)baseline=Array.from(gp.axes).slice(0,4);connected=true;
   const axes=Array.from({length:4},(_,i)=>{const raw=gp.axes[i]??0,base=baseline[i]??0;const v=Math.abs(base)>0.85&&Math.abs(raw-base)<0.35?0:Math.max(-1,Math.min(1,raw-base));return Math.round(deadzone(v,0.18)*100)/100;});
   listener({connected:true,name:gp.id,axes,buttons:gp.buttons.map(b=>b.pressed),triggers:{left:deadzone(gp.buttons[6]?.value??0,0.08),right:deadzone(gp.buttons[7]?.value??0,0.08)}});
  }else{connected=false;baseline=[0,0,0,0];listener({connected:false,name:'',axes:[0,0,0,0],buttons:[],triggers:{left:0,right:0}});}
  raf=requestAnimationFrame(poll);
 };poll();return()=>cancelAnimationFrame(raf);
}
