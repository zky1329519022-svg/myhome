import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const output = 'C:/Users/zky13/.codex/visualizations/2026/09/13/01a09a37-00cd-7be0-8ed9-a8c8980af7b6';
const profile = await mkdtemp(join(tmpdir(), 'roxy-qa-'));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9337', `--user-data-dir=${profile}`, 'about:blank'], {windowsHide:true, stdio:'ignore'});
const pause = ms => new Promise(resolve=>setTimeout(resolve, ms));
let socket;
try {
  let targets;
  for(let attempt=0;attempt<30;attempt++) {try {targets=await (await fetch('http://127.0.0.1:9337/json')).json(); break;} catch {await pause(250);}}
  assert.ok(targets, 'Headless browser started');
  socket = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0; const pending=new Map(); const errors=[];
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const item=pending.get(message.id);pending.delete(message.id);message.error?item.reject(new Error(JSON.stringify(message.error))):item.resolve(message.result);} if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  const shot=async name=>{const {data}=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(output,name+'.png'),Buffer.from(data,'base64'));const preview=await send('Page.captureScreenshot',{format:'jpeg',quality:40});await writeFile(join(output,name+'.jpg'),Buffer.from(preview.data,'base64'));};
  const click=async label=>{assert.equal(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b)return false;b.click();return true})()`),true, label+' exists');await pause(350);};
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://localhost:5173/'});
  for(let i=0;i<80;i++){if(await evaluate(`!!document.querySelector('.roxy-name') && [...document.images].every(i=>i.complete && i.naturalWidth>0)`))break;await pause(250);}
  await pause(1000);
  await shot('roxy-desktop');
  const original=await evaluate(`document.querySelector('.roxy-words').textContent`);
  await evaluate(`document.querySelector('.roxy-name').click()`);await pause(100);
  assert.notEqual(await evaluate(`document.querySelector('.roxy-words').textContent`),original,'Roxy dialogue responds');
  for(const [name,key] of [['回到屋里','interior'],['一起阅读','reading'],['窗边书桌','desk'],['写下一念','write'],['今日回望','review'],['记忆书架','library'],['思维星图','stars']]) {
    await click(name);assert.equal(await evaluate(`document.querySelector('main').dataset.scene`),key);
    assert.equal(await evaluate(`[...document.images].filter(i=>!i.complete||!i.naturalWidth).length`),0,'Scene images loaded');
  }
  const before=await evaluate(`document.querySelectorAll('.node').length`);
  await click('和 Roxy 点亮一颗星');assert.equal(await evaluate(`document.querySelectorAll('.node').length`),before+1);
  await click('写下一念');await evaluate(`(()=>{const el=document.querySelector('textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(el,'Roxy smoke test');el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await pause(200);await click('暂存这段念头');
  assert.ok(await evaluate(`JSON.parse(localStorage.getItem('farfield-quick-notes')||'[]').some(n=>n.text==='Roxy smoke test')`),'Note saved');
  await shot('roxy-writing-desktop');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const name of ['雨中散步','回到屋里','一起阅读','窗边书桌','写下一念','今日回望','记忆书架','思维星图']) {
    await click(name);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'No horizontal page overflow: '+name);
    const result=await evaluate(`(()=>{const el=document.querySelector('.roxy-panel,.roxy-page,.roxy-dialogue');const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})()`);
    assert.ok(result.top>=0&&result.bottom<=844,'Main interaction remains in viewport: '+name);
  }
  await shot('roxy-stars-mobile');await click('雨中散步');await shot('roxy-mobile');await click('一起阅读');await shot('roxy-reading-mobile');
  assert.equal(errors.length,0,'No runtime errors: '+errors.join(', '));
  console.log('PASS: eight scenes, Roxy dialogue, note saving, star creation, image loading, desktop/mobile viewport checks.');
} finally { socket?.close();edge.kill(); }
