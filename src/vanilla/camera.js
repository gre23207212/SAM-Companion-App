import { getLinkState,subscribeLink } from '../lib/go2-link.js';
import { html,icon } from './dom.js';
export function camera(showLabel=true,mini=false) {
 const node=html(`<div class="relative w-full h-full bg-background overflow-hidden"><video autoplay playsinline muted class="absolute inset-0 w-full h-full object-cover hidden"></video><div data-idle class="absolute inset-0 flex items-center justify-center scanline"><div class="absolute inset-0 overflow-hidden pointer-events-none"><div class="w-full h-px bg-primary/20 animate-scan"></div></div><div class="text-center z-10 px-3">${icon('video-off',mini?18:32,'text-muted-foreground/30 mx-auto mb-2')}<span data-title class="tracking-[0.4em] text-muted-foreground/60 font-mono font-light ${mini?'text-[10px]':'text-xl animate-pulse-glow'}">NO SIGNAL</span>${mini?'':'<p data-detail class="text-[10px] text-muted-foreground/40 mt-1 font-mono"></p>'}</div></div>${showLabel?'<span data-label class="absolute top-2 left-2 z-10 text-[8px] font-mono px-1.5 py-0.5 rounded tracking-wider border"></span>':''}</div>`);
 const video=node.querySelector('video');let playing=false,stream=null,disposed=false;
 const refresh=()=>{
  const link=getLinkState(),online=link.status==='online',busy=['connecting','validating'].includes(link.status),next=online?link.stream:null;
  if(stream!==next){stream=next;playing=false;video.srcObject=next;if(next)video.play().catch(()=>{});}
  const live=!!stream&&playing,connecting=busy||(online&&!stream);
  video.classList.toggle('hidden',!live);node.querySelector('[data-idle]').hidden=live;
  node.querySelector('[data-title]').textContent=connecting?'CONNECTING':'NO SIGNAL';
  const detail=node.querySelector('[data-detail]');if(detail)detail.textContent=!online?'Connect the robot to enable the camera':link.status==='error'?'Camera stream failed. Check the Go2 camera module.':connecting?'Negotiating WebRTC handshake...':'Waiting for camera stream...';
  const label=node.querySelector('[data-label]');if(label){label.textContent=live?'● LIVE':connecting?'◌ CONNECTING':'○ NO SIGNAL';label.className=`absolute top-2 left-2 z-10 text-[8px] font-mono px-1.5 py-0.5 rounded tracking-wider border ${live?'bg-success/10 text-success border-success/20':connecting?'bg-warning/10 text-warning border-warning/20':'bg-secondary/80 text-muted-foreground border-border/50'}`;}
 };
 video.onplaying=()=>{if(!disposed){playing=true;refresh();}};video.onstalled=video.onerror=()=>{playing=false;refresh();};const off=subscribeLink(refresh);refresh();
 return {node,destroy(){disposed=true;off();video.pause();video.srcObject=null;}};
}
