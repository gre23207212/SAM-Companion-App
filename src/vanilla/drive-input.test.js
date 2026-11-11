import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {driveInput,WATCHDOG_MS} from './drive-input.js';
import {resetBindings,setKeyBinding} from '../lib/bindings.js';
let input,send,stopped;
const key=(type,key)=>window.dispatchEvent(new KeyboardEvent(type,{key,cancelable:true}));
beforeEach(()=>{vi.useFakeTimers();resetBindings();send=vi.fn();stopped=false;input=driveInput({send,stop:()=>stopped=!stopped,action:vi.fn(),isStopped:()=>stopped});send.mockClear();});
afterEach(()=>{input.destroy();vi.useRealTimers();});
describe('converted drive behavior',()=>{
 it('streams at the existing 50ms watchdog interval',()=>{expect(WATCHDOG_MS).toBe(50);key('keydown','w');vi.advanceTimersByTime(49);expect(send).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(send).toHaveBeenLastCalledWith(.15,-0,-0);});
 it('preserves the precise 0.8 rad/s turn cap',()=>{key('keydown','ArrowRight');vi.advanceTimersByTime(50);expect(send).toHaveBeenLastCalledWith(0,-0,-.8);});
 it('sends zero immediately on keyboard release',()=>{key('keydown','w');vi.advanceTimersByTime(50);key('keyup','w');expect(send).toHaveBeenLastCalledWith(0,0,0);});
 it('sends zero immediately on blur and does not retain held keys',()=>{key('keydown','w');vi.advanceTimersByTime(50);window.dispatchEvent(new Event('blur'));expect(send).toHaveBeenLastCalledWith(0,0,0);send.mockClear();vi.advanceTimersByTime(100);expect(send).not.toHaveBeenCalled();});
 it('sends zero when active bindings change',()=>{key('keydown','w');vi.advanceTimersByTime(50);setKeyBinding('forward','q');expect(send).toHaveBeenLastCalledWith(0,0,0);send.mockClear();vi.advanceTimersByTime(100);expect(send).not.toHaveBeenCalled();});
 it('sends zero on navigation cleanup',()=>{key('keydown','w');vi.advanceTimersByTime(50);input.destroy();expect(send).toHaveBeenLastCalledWith(0,0,0);});
 it('never sends nonzero movement while emergency stop is engaged',()=>{key('keydown',' ');key('keydown','w');send.mockClear();vi.advanceTimersByTime(100);expect(send).not.toHaveBeenCalled();});
 it('stops touch input on release',()=>{input.touch('left',{x:0,y:-1});vi.advanceTimersByTime(50);expect(send).toHaveBeenLastCalledWith(.15,-0,-0);input.touch('left',{x:0,y:0});expect(send).toHaveBeenLastCalledWith(0,0,0);});
 it('ignores driving keys typed in an input',()=>{const field=document.createElement('input');document.body.append(field);field.dispatchEvent(new KeyboardEvent('keydown',{key:'w',bubbles:true}));vi.advanceTimersByTime(50);expect(send).not.toHaveBeenCalled();field.remove();});
});
