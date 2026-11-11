import { icon } from './icons.js';
export { icon };
export const html = (markup) => { const t=document.createElement('template');t.innerHTML=markup;return t.content.firstElementChild; };
export const escape = (value) => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const byText = (root, selector, text) => [...root.querySelectorAll(selector)].find(e=>e.textContent.trim()===text);
export const setText = (root, selector, text) => { const e=root.querySelector(selector);if(e)e.textContent=text; };
export function scope() {
 const cleanups=[];
 return { on(target,type,fn,options) {target.addEventListener(type,fn,options);cleanups.push(()=>target.removeEventListener(type,fn,options));}, add(fn){cleanups.push(fn);return fn;}, interval(fn,ms){const id=setInterval(fn,ms);cleanups.push(()=>clearInterval(id));}, destroy(){for(const fn of cleanups.splice(0).reverse())fn();} };
}
export function toast({title,description='',variant=''}) {
 let host=document.getElementById('sam-toast');if(!host){host=document.createElement('div');host.id='sam-toast';document.body.append(host);}
 host.className=`sam-toast ${variant==='destructive'?'sam-toast-danger':''}`;
 host.innerHTML=`<div class="font-semibold text-sm">${escape(title)}</div>${description?`<p class="text-sm mt-1">${escape(description)}</p>`:''}<button aria-label="Dismiss notification">×</button>`;
 host.querySelector('button').onclick=()=>host.remove();clearTimeout(toast.timer);toast.timer=setTimeout(()=>host.remove(),5000);
}
export function button(label,fn,cls='px-3 py-2 rounded-lg text-xs border border-border/60 bg-secondary/40') { const b=html(`<button type="button" class="${cls}">${label}</button>`);b.onclick=fn;return b; }
