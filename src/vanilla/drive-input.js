import {MAX_LINEAR,MAX_YAW} from '../lib/drive-limits.js';
import {getBindings,keyboardAxes,subscribeBindings} from '../lib/bindings.js';
import {sendMove,subscribeLink,getLinkState} from '../lib/go2-link.js';
import {scope} from './dom.js';
export const WATCHDOG_MS=50;
const clamp=v=>Math.max(-1,Math.min(1,v));
const deadzone=v=>Math.abs(v)<.12?0:Math.sign(v)*(Math.abs(v)-.12)/.88;
export function driveInput({stop,action,isStopped,speed=()=>100,render=()=>{},send=sendMove,target=window,visibility=document}){
 const life=scope(),keys=new Set();let left={x:0,y:0},right={x:0,y:0},pad={connected:false,axes:[0,0,0,0],buttons:[]},prev=[],wasMoving=false;
 const clear=()=>{keys.clear();left={x:0,y:0};right={x:0,y:0};pad={...pad,axes:[0,0,0,0]};send(0,0,0);wasMoving=false;draw();};
 const axes=()=>{const kb=keyboardAxes(keys),lx=clamp((pad.connected?pad.axes[0]:0)+deadzone(left.x)),ly=clamp((pad.connected?pad.axes[1]:0)+deadzone(left.y)),rx=clamp((pad.connected?pad.axes[2]:0)+deadzone(right.x)),ry=clamp((pad.connected?pad.axes[3]:0)+(keys.has('arrowdown')?1:0)-(keys.has('arrowup')?1:0));return {forward:clamp(-ly+kb.forward),strafe:clamp(lx+kb.strafe),yaw:clamp(rx+kb.yaw),left:{x:clamp(lx+kb.strafe),y:clamp(ly-kb.forward)},right:{x:clamp(rx+kb.yaw),y:ry}};};
 function draw(){const a=axes();render(a,keys.size>0||a.forward!==0||a.strafe!==0||a.yaw!==0);}
 life.on(target,'keydown',e=>{if(e.target?.matches?.('input,textarea,select,[contenteditable="true"]')||e.ctrlKey||e.metaKey)return;const k=e.key.toLowerCase(),b=getBindings().keys;if(e.repeat&&Object.values(b).includes(k)){e.preventDefault();return;}if(k===b.stop){e.preventDefault();clear();stop();return;}if(k===b.standUp||k===b.sit){e.preventDefault();action(k===b.standUp?'standUp':'sit');return;}if(![b.forward,b.back,b.turnLeft,b.turnRight,b.strafeLeft,b.strafeRight,'arrowup','arrowdown'].includes(k))return;e.preventDefault();keys.add(k);draw();});
 life.on(target,'keyup',e=>{keys.delete(e.key.toLowerCase());draw();if(!keys.size&&!left.x&&!left.y&&!right.x&&!pad.axes.some(Boolean))clear();});
 life.on(target,'blur',clear);life.on(visibility,'visibilitychange',()=>{if(visibility.hidden)clear();});life.add(subscribeBindings(clear));life.add(subscribeLink(()=>{if(getLinkState().status!=='online')clear();}));
 life.interval(()=>{const a=axes(),moving=!isStopped()&&(a.forward!==0||a.strafe!==0||a.yaw!==0);if(moving){const s=speed()/100;send(a.forward*MAX_LINEAR*s,-a.strafe*MAX_LINEAR*s,-a.yaw*MAX_YAW*s);}else if(wasMoving)send(0,0,0);wasMoving=moving;draw();},WATCHDOG_MS);
 send(0,0,0);
 return {clear,touch(side,value){if(side==='left')left=value;else right={x:value.x,y:0};draw();if(!value.x&&!value.y&&!keys.size&&!pad.axes.some(Boolean))clear();},gamepad(next){const b=getBindings().pad;for(const a of ['stop','standUp','sit'])if(next.buttons[b[a]]&&!prev[b[a]]){if(a==='stop'){clear();stop();}else action(a);}prev=next.buttons;const dropped=pad.connected&&!next.connected;pad=next;if(dropped)clear();draw();},destroy(){life.destroy();clear();}};
}
