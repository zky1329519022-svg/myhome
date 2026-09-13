"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookOpen, CalendarDays, CloudRain, Download, Home, Link2, Maximize2,
  MoonStar, Plus, RotateCcw, RotateCw, Search, Settings2, Sparkles,
  Sun, Trash2, Upload, Volume2, VolumeX, X, ZoomIn, ZoomOut
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

type Scene = "outdoor" | "interior" | "reading" | "desk" | "stars" | "write" | "review" | "library";
type Weather = "sun" | "rain";
type NodeType = "念头" | "问题" | "记忆" | "灵感" | "人物" | "地点" | "梦境" | "情绪" | "决定";
type ThoughtNode = { id:string; title:string; body:string; x:number; y:number; type:NodeType; mood:string; tags:string[]; created:string; important?:boolean };
type Edge = { id:string; from:string; to:string };
type Snapshot = { nodes:ThoughtNode[]; edges:Edge[] };

const seedNodes: ThoughtNode[] = [
  { id:"root", title:"我想怎样生活？", body:"不是一份答案，而是一条会继续生长的路。", x:710, y:390, type:"问题", mood:"清醒", tags:["生活","起点"], created:"2026-09-12", important:true },
  { id:"n2", title:"保留独处的时间", body:"安静不是空白，它让微小的声音重新被听见。", x:430, y:235, type:"决定", mood:"安定", tags:["独处"], created:"2026-09-10" },
  { id:"n3", title:"雨中的旧车站", body:"窗上的雾把站台变得很远，那一刻我突然想起童年。", x:1010, y:220, type:"记忆", mood:"怀念", tags:["雨","童年"], created:"2026-08-27" },
  { id:"n4", title:"未写完的故事", body:"也许主角真正寻找的并不是故乡。", x:990, y:570, type:"灵感", mood:"好奇", tags:["写作"], created:"2026-09-11" },
  { id:"n5", title:"缓慢是否也是前进？", body:"把速度从价值判断里拿走之后，事情会变成什么？", x:410, y:575, type:"念头", mood:"沉思", tags:["时间"], created:"2026-09-12" },
];
const seedEdges: Edge[] = [
  {id:"e1",from:"root",to:"n2"},{id:"e2",from:"root",to:"n3"},{id:"e3",from:"root",to:"n4"},{id:"e4",from:"root",to:"n5"},{id:"e5",from:"n3",to:"n4"}
];
const readings = [
  { date:"九月十二日", kind:"随笔", title:"关于缓慢", text:"我逐渐明白，缓慢不总是迟疑。有些念头需要在看不见的地方生根，像雨停之后仍在土壤里移动的水。" },
  { date:"八月二十七日", kind:"记忆", title:"旧车站", text:"那天的雨把远处的灯晕成一小片橙色。列车尚未来，我却第一次觉得，等待也可以是一间临时的房屋。" },
  { date:"七月三日", kind:"收藏", title:"留白", text:"真正重要的事物，有时要等房间安静下来，才肯显出自己的轮廓。" },
];
const typeColor: Record<NodeType,string> = { 念头:"#c6b078",问题:"#9eb5bc",记忆:"#b99475",灵感:"#d3ad61",人物:"#ac8e86",地点:"#819e8d",梦境:"#918aa7",情绪:"#b88d82",决定:"#9fa86f" };

const sceneNames: Record<Scene,string> = {outdoor:"雨中散步",interior:"回到屋里",reading:"一起阅读",desk:"窗边书桌",write:"写下一念",review:"今日回望",library:"记忆书架",stars:"思维星图"};
const outdoorPhotos = ["IMG_5853.PNG","IMG_5862.PNG","IMG_5863.PNG"];
const roomPhotos = ["IMG_5858.PNG","IMG_5861.PNG","IMG_5860.PNG","IMG_5856.PNG"];
const scenePhotos: Record<Scene,string> = {outdoor:"IMG_5853.PNG",interior:"IMG_5858.PNG",reading:"IMG_5858.PNG",desk:"IMG_5854.PNG",write:"IMG_5856.PNG",review:"IMG_5859.PNG",library:"IMG_5857.PNG",stars:"IMG_5864.PNG"};
const roxyWords: Record<Scene,string[]> = {
 outdoor:["你来了。陪我走一段吧，雨里的城市很安静。","不用急着到达哪里。我们可以在这里多待一会儿。"],
 interior:["进来吧。你想和我读一会儿，还是写点什么？","雨还没停，不过这里正好可以歇歇。"],
 reading:["这段文字，你也喜欢吗？我想听听你的想法。","慢慢翻吧。有些句子，值得再读一遍。"],
 desk:["我把位置留给你了。今天有什么想记下来？","一个念头、一段回忆，或者一颗新的星星。"],
 write:["我在听。把此刻的心情留在这里吧。","不用整理好再开口。零碎的想法也很珍贵。"],
 review:["一起看看，那些被时间留下的小事吧。","这些是回望示例。你自己的记录会留在这台设备里。"],
 library:["选一本吧，我陪你一起翻。","熟悉的文字，也会在不同的日子里长出新意思。"],
 stars:["每个念头都可以是一颗星。我们一起把它们连起来吧。","点一下新的星星，就可以写下它的故事。"]
};
function RoxyDialogue({scene,children,compact=false}:{scene:Scene;children?:React.ReactNode;compact?:boolean}) {
 const [line,setLine]=useState(0);
 return <aside className={`roxy-dialogue ${compact?"roxy-compact":""}`} aria-label="与 Roxy 互动"><button className="roxy-name" onClick={()=>setLine(n=>n+1)} aria-label="和 Roxy 聊聊"><img src="/roxy/IMG_5010.JPG" alt="Roxy"/><span>Roxy<small>和你一起，慢一点。</small></span><span className="roxy-chat-label">聊聊 ↗</span></button><p aria-live="polite" className="roxy-words">{roxyWords[scene][line%roxyWords[scene].length]}</p>{children&&<div className="roxy-actions">{children}</div>}</aside>;
}
function SceneAction({children,onClick,primary=false}:{children:React.ReactNode;onClick:()=>void;primary?:boolean}) {return <button className={`scene-action ${primary?"scene-action-primary":""}`} onClick={onClick}>{children}</button>;}

function IconButton({label,children,onClick,className=""}:{label:string;children:React.ReactNode;onClick?:()=>void;className?:string}) {
  return <button aria-label={label} title={label} onClick={onClick} className={`utility-button grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-[#f4e6cb] backdrop-blur-md transition hover:border-[#efc478]/70 hover:bg-[#20160d]/65 ${className}`}>{children}</button>;
}

export default function FarfieldHome() {
  const [scene,setScene] = useState<Scene>("outdoor");
  const [weather,setWeather] = useState<Weather>("sun");
  const [sound,setSound] = useState(false);
  const [settings,setSettings] = useState(false);
  const [reduced,setReduced] = useState(false);
  const [contrast,setContrast] = useState(false);
  const [fontScale,setFontScale] = useState(1);
  const [pointer,setPointer] = useState({x:0,y:0});
  const [outdoorPlace,setOutdoorPlace] = useState(0);
  const [roomPlace,setRoomPlace] = useState(0);
  const audioRef = useRef<{ctx:AudioContext; nodes:AudioNode[]} | null>(null);

  useEffect(()=>{
    const hour = new Date().getHours();
    setWeather(hour >= 7 && hour < 18 ? "sun" : "rain");
    const saved = localStorage.getItem("farfield-preferences");
    if(saved) try { const p=JSON.parse(saved); setReduced(!!p.reduced); setContrast(!!p.contrast); setFontScale(p.fontScale || 1); setWeather(p.weather || "sun"); } catch {}
  },[]);
  useEffect(()=>{ localStorage.setItem("farfield-preferences",JSON.stringify({reduced,contrast,fontScale,weather})); document.documentElement.style.setProperty("--font-scale",String(fontScale)); },[reduced,contrast,fontScale,weather]);
  useEffect(()=>()=>{ audioRef.current?.ctx.close(); },[]);

  const toggleSound = () => {
    if(sound){ audioRef.current?.ctx.close(); audioRef.current=null; setSound(false); return; }
    const Ctx = window.AudioContext || (window as typeof window & {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
    const ctx = new Ctx(); const gain=ctx.createGain(); gain.gain.value=.035; gain.connect(ctx.destination);
    const osc=ctx.createOscillator(); osc.type="sine"; osc.frequency.value=weather==="rain"?86:132;
    const lfo=ctx.createOscillator(); const lfoGain=ctx.createGain(); lfo.frequency.value=.12; lfoGain.gain.value=12; lfo.connect(lfoGain).connect(osc.frequency); osc.connect(gain); osc.start(); lfo.start();
    audioRef.current={ctx,nodes:[gain,osc,lfo,lfoGain]}; setSound(true);
  };
  const go = (next:Scene) => setScene(next);
  const outside = scene === "outdoor";
  const room = scene === "interior";
  const photo = `/roxy/${outside?outdoorPhotos[outdoorPlace]:room?roomPhotos[roomPlace]:scenePhotos[scene]}`;
  const working = !outside && !room && scene!=="desk";

  return (
    <main data-scene={scene} className={`roxy-world ${working?"roxy-working":""} ${weather==="rain"?"scene-rain":"scene-sun"} ${reduced?"reduced-motion":""} ${contrast?"high-contrast":""} relative h-[100svh] w-screen overflow-hidden bg-[#0b1210]`} onPointerMove={e=>!reduced&&e.pointerType==="mouse"&&setPointer({x:(e.clientX/innerWidth-.5)*10,y:(e.clientY/innerHeight-.5)*8})}>
      <img src={photo} alt="" aria-hidden="true" className="roxy-atmosphere"/>
      <img key={photo} src={photo} alt={`Roxy · ${sceneNames[scene]}`} className="scene-photo" style={{transform:`translate(${pointer.x*.35}px,${pointer.y*.3}px)`}}/>
      <div className="roxy-shade" aria-hidden="true"/>
      {scene!=="stars" && <><div className="vignette"/><div className="rain"/><div className="dust absolute inset-0 opacity-20 pointer-events-none"/></>}

      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between p-4 sm:p-6">
        <button onClick={()=>go("outdoor")} className="flex items-center gap-3 text-left text-[#f4ead5] drop-shadow-lg" aria-label="回到远野">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/20 backdrop-blur"><Home size={17}/></span>
          <span><b className="block text-[.95rem] font-normal tracking-[.28em]">远野心屋</b><small className="hidden text-[.75rem] tracking-[.12em] text-white/65 sm:block">WITH ROXY · {sceneNames[scene]}</small></span>
        </button>
        <div className="flex items-center gap-2">
          <IconButton label={weather==="sun"?"切换为雨天":"切换为晴天"} onClick={()=>setWeather(w=>w==="sun"?"rain":"sun")}>{weather==="sun"?<Sun size={17}/>:<CloudRain size={17}/>}</IconButton>
          <IconButton label={sound?"关闭环境声":"开启环境声"} onClick={toggleSound}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</IconButton>
          <IconButton label="显示设置" onClick={()=>setSettings(v=>!v)}><Settings2 size={17}/></IconButton>
        </div>
      </header>

      {settings && <aside className="glass fade-in absolute right-4 top-20 z-50 w-[min(21rem,calc(100%-2rem))] rounded-2xl p-5 sm:right-6" aria-label="体验设置">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-base tracking-[.18em]">感受设置</h2><button aria-label="关闭设置" onClick={()=>setSettings(false)}><X size={18}/></button></div>
        <label className="mb-4 flex items-center justify-between text-sm"><span>减少动态效果</span><Switch checked={reduced} onCheckedChange={setReduced}/></label>
        <label className="mb-5 flex items-center justify-between text-sm"><span>高对比度</span><Switch checked={contrast} onCheckedChange={setContrast}/></label>
        <label className="block text-sm"><span className="mb-2 flex justify-between"><span>文字大小</span><span className="text-white/55">{Math.round(fontScale*100)}%</span></span><input className="w-full accent-[#d3a363]" type="range" min="0.9" max="1.2" step="0.05" value={fontScale} onChange={e=>setFontScale(Number(e.target.value))}/></label>
        <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-white/45">记录仅保存在这台设备的浏览器中。声音默认关闭。</p>
      </aside>}

      {outside && <Outdoor onEnter={()=>go("interior")} onWalk={()=>setOutdoorPlace(n=>(n+1)%outdoorPhotos.length)} place={outdoorPlace}/>}
      {room && <Interior onReading={()=>go("reading")} onDesk={()=>go("desk")} onOutside={()=>go("outdoor")} onChange={()=>setRoomPlace(n=>(n+1)%roomPhotos.length)} weather={weather}/>}
      {scene==="reading" && <Reading onBack={()=>go("interior")} />}
      {scene==="desk" && <Desk onBack={()=>go("interior")} onGo={go}/>} 
      {scene==="write" && <QuickWrite onBack={()=>go("desk")} onStars={()=>go("stars")} />}
      {scene==="review" && <Review onBack={()=>go("desk")} />}
      {scene==="library" && <Library onBack={()=>go("desk")} onReading={()=>go("reading")} />}
      {scene==="stars" && <StarMap onBack={()=>go("desk")} />}

      {working && scene!=="stars" && <RoxyDialogue key={scene} scene={scene} compact/>}
      <nav className="scene-nav" aria-label="场景导航">{(Object.keys(sceneNames) as Scene[]).map(s=><button key={s} aria-current={scene===s?"page":undefined} onClick={()=>go(s)}>{sceneNames[s]}</button>)}</nav>
    </main>
  );
}

function Outdoor({onEnter,onWalk,place}:{onEnter:()=>void;onWalk:()=>void;place:number}) {
  return <section className="roxy-stage absolute inset-0 z-20"><div className="scene-heading"><p>01 / OUTSIDE · {["雾蓝港口","落日球场","雨夜长廊"][place]}</p><h1>陪 Roxy，<br/>走进雨里的日常。</h1></div><RoxyDialogue scene="outdoor"><SceneAction primary onClick={onEnter}><Home size={17}/>和 Roxy 回屋</SceneAction><SceneAction onClick={onWalk}>换个地方散步 ↗</SceneAction></RoxyDialogue></section>;
}

function Interior({onReading,onDesk,onOutside,onChange,weather}:{onReading:()=>void;onDesk:()=>void;onOutside:()=>void;onChange:()=>void;weather:Weather}) {
 return <section className="roxy-stage absolute inset-0 z-20"><div className="scene-heading"><p>02 / AT HOME · {weather==="rain"?"雨落在窗上":"天光越过窗沿"}</p><h1>有你在，<br/>平常的日子也很好。</h1></div><RoxyDialogue scene="interior"><SceneAction primary onClick={onReading}><BookOpen size={17}/>和 Roxy 一起读</SceneAction><SceneAction onClick={onDesk}><Sparkles size={17}/>一起写点什么</SceneAction><SceneAction onClick={onChange}>换个角落</SceneAction><SceneAction onClick={onOutside}>出去走走</SceneAction></RoxyDialogue></section>;
}

function Reading({onBack}:{onBack:()=>void}) {
  const [page,setPage]=useState(0); const [focus,setFocus]=useState(false);
  const item=readings[page];
  return <section className={`roxy-reading roxy-work-surface ${focus?"reading-focus":""} absolute inset-0 z-30 p-4`}>
    <button onClick={onBack} className="work-back"><ArrowLeft size={16}/>回到 Roxy 身边</button>
    <article key={page} className="roxy-page page-turn rounded-2xl border border-[#d9ddeb]/30 bg-[#f0ede5] px-[clamp(1.5rem,4vw,3rem)] py-8 text-[#332a20] shadow-[0_30px_100px_#0007]">
      <div className="mb-10 flex items-center justify-between border-b border-[#4d3e2a]/20 pb-4 text-xs tracking-[.24em] text-[#695943]"><span>{item.kind}</span><span>{item.date}</span></div>
      <h2 className="mb-7 text-2xl tracking-[.15em] sm:text-3xl">{item.title}</h2><p className="min-h-40 text-[1.05rem] leading-9 tracking-[.06em] sm:text-lg">{item.text}</p>
      <div className="mt-10 flex items-center justify-between"><button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="disabled:opacity-25">前一页</button><span className="text-xs">— {page+1} / {readings.length} —</span><button disabled={page===readings.length-1} onClick={()=>setPage(p=>p+1)} className="disabled:opacity-25">后一页</button></div>
    </article>
    <div className="absolute bottom-5 flex gap-2"><button onClick={()=>setPage(Math.floor(Math.random()*readings.length))} className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs tracking-[.12em]">请 Roxy 随机翻一页</button><IconButton label={focus?"退出专注":"专注阅读"} onClick={()=>setFocus(v=>!v)}><Maximize2 size={15}/></IconButton></div>
  </section>;
}

function Desk({onBack,onGo}:{onBack:()=>void;onGo:(s:Scene)=>void}) {
 return <section className="roxy-stage absolute inset-0 z-30"><div className="scene-heading"><p>04 / LITTLE THOUGHTS · 窗边书桌</p><h1>把心里的话，<br/>慢慢说给 Roxy 听。</h1></div><RoxyDialogue scene="desk"><SceneAction primary onClick={()=>onGo("write")}><Sparkles size={17}/>写下一念</SceneAction><SceneAction onClick={()=>onGo("stars")}><MoonStar size={17}/>一起连接星星</SceneAction><SceneAction onClick={()=>onGo("review")}><CalendarDays size={17}/>今日回望</SceneAction><SceneAction onClick={()=>onGo("library")}><BookOpen size={17}/>记忆书架</SceneAction></RoxyDialogue><button onClick={onBack} className="work-back"><ArrowLeft size={16}/>回到屋里</button></section>;
}

function Panel({title,kicker,onBack,children}:{title:string;kicker:string;onBack:()=>void;children:React.ReactNode}) { return <section className="roxy-work-surface absolute inset-0 z-30 p-4"><button onClick={onBack} className="work-back"><ArrowLeft size={16}/>回到书桌</button><div className="roxy-panel glass fade-in rounded-2xl p-[clamp(1.5rem,3vw,2.5rem)]"><p className="text-sm tracking-[.18em] text-[#b4c5f4]">ROXY / {kicker}</p><h1 className="mb-6 mt-3 text-2xl font-normal tracking-[.08em]">{title}</h1>{children}</div></section> }

function QuickWrite({onBack,onStars}:{onBack:()=>void;onStars:()=>void}) {
  const [text,setText]=useState(""); const [mood,setMood]=useState("平静"); const [saved,setSaved]=useState(false);
  const save=()=>{ if(!text.trim())return; const raw=localStorage.getItem("farfield-quick-notes"); const notes=raw?JSON.parse(raw):[]; notes.unshift({text,mood,date:new Date().toISOString()}); localStorage.setItem("farfield-quick-notes",JSON.stringify(notes)); setSaved(true); setText(""); };
  return <Panel title="此刻，什么正在经过你的脑海？" kicker="写下一念" onBack={onBack}>{saved&&<p className="mb-5 rounded-xl border border-[#d8b16a]/25 bg-[#d8b16a]/10 p-3 text-sm">它已经像一粒种子，落进了你的记录。</p>}<textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="不必完整，也不必正确……" className="min-h-48 w-full resize-none border-0 border-b border-white/15 bg-transparent text-lg leading-8 outline-none placeholder:text-white/25"/><div className="mt-5 flex flex-wrap items-center gap-3"><select value={mood} onChange={e=>setMood(e.target.value)} className="rounded-full border border-white/15 bg-[#18211d] px-4 py-2 text-sm"><option>平静</option><option>好奇</option><option>困惑</option><option>怀念</option><option>喜悦</option></select><button onClick={save} className="rounded-full bg-[#d3a363] px-5 py-2 text-sm text-[#17120c]">暂存这段念头</button><button onClick={onStars} className="rounded-full border border-white/15 px-5 py-2 text-sm">进入星图整理</button></div></Panel>;
}
function Review({onBack}:{onBack:()=>void}) { return <Panel title="今日回望" kicker="九月十二日 · 夜" onBack={onBack}><div className="space-y-5"><ReviewLine date="今天" text="你记录了 2 个念头，并让“缓慢”连接到一段旧记忆。"/><ReviewLine date="七个月前" text="你曾想过类似的事情：独处究竟是退后，还是重新看见？"/><ReviewLine date="尚未继续" text="“未写完的故事”安静了 16 天。它不催促你。"/><ReviewLine date="新的关联" text="雨、旧车站与等待，似乎正在形成一个小小的星座。"/></div></Panel> }
function ReviewLine({date,text}:{date:string;text:string}) { return <div className="grid grid-cols-[6rem_1fr] gap-4 border-b border-white/10 pb-5"><span className="text-xs tracking-[.15em] text-[#d6ad71]">{date}</span><p className="text-sm leading-7 text-white/75">{text}</p></div> }
function Library({onBack,onReading}:{onBack:()=>void;onReading:()=>void}) { return <Panel title="记忆书架" kicker="被时间留下的纸页" onBack={onBack}><div className="grid gap-3 sm:grid-cols-3">{readings.map((r,i)=><button key={r.title} onClick={onReading} className="min-h-48 rounded-r-lg border-l-8 border-[#8a5c3d] bg-[#d8c49b] p-5 text-left text-[#382d23] shadow-lg transition hover:-translate-y-1"><small>{r.kind} · {r.date}</small><h2 className="mt-6 text-lg tracking-[.12em]">{r.title}</h2><p className="mt-4 line-clamp-3 text-xs leading-6 opacity-70">{r.text}</p></button>)}</div></Panel> }

function StarMap({onBack}:{onBack:()=>void}) {
  const [nodes,setNodes]=useState<ThoughtNode[]>(seedNodes); const [edges,setEdges]=useState<Edge[]>(seedEdges);
  const [selected,setSelected]=useState<string|null>("root"); const [linkFrom,setLinkFrom]=useState<string|null>(null); const [search,setSearch]=useState(""); const [zoom,setZoom]=useState(.78); const [pan,setPan]=useState({x:0,y:0}); const [drag,setDrag]=useState<string|null>(null); const [panning,setPanning]=useState(false); const [deleteOpen,setDeleteOpen]=useState(false); const [timeline,setTimeline]=useState(false);
  const history=useRef<Snapshot[]>([]); const future=useRef<Snapshot[]>([]); const mapRef=useRef<HTMLDivElement>(null); const lastPointer=useRef({x:0,y:0}); const loaded=useRef(false);
  useEffect(()=>{ const raw=localStorage.getItem("farfield-mind-map"); if(raw)try{const d=JSON.parse(raw);setNodes(d.nodes);setEdges(d.edges)}catch{} loaded.current=true; },[]);
  useEffect(()=>{ if(loaded.current)localStorage.setItem("farfield-mind-map",JSON.stringify({nodes,edges})); },[nodes,edges]);
  const commit=useCallback(()=>{history.current.push({nodes:structuredClone(nodes),edges:structuredClone(edges)}); if(history.current.length>40)history.current.shift(); future.current=[];},[nodes,edges]);
  const addNode=useCallback((x=800,y=450,title="未命名的念头")=>{commit();const id=`n-${Date.now()}`;setNodes(v=>[...v,{id,title,body:"",x,y,type:"念头",mood:"平静",tags:[],created:new Date().toISOString().slice(0,10)}]);setSelected(id);return id;},[commit]);
  const undo=()=>{const prev=history.current.pop();if(!prev)return;future.current.push({nodes,edges});setNodes(prev.nodes);setEdges(prev.edges)}; const redo=()=>{const next=future.current.pop();if(!next)return;history.current.push({nodes,edges});setNodes(next.nodes);setEdges(next.edges)};
  const selectedNode=nodes.find(n=>n.id===selected);
  const nodeClick=(id:string)=>{if(linkFrom&&linkFrom!==id){commit();if(!edges.some(e=>(e.from===linkFrom&&e.to===id)||(e.to===linkFrom&&e.from===id)))setEdges(v=>[...v,{id:`e-${Date.now()}`,from:linkFrom,to:id}]);setLinkFrom(null)}setSelected(id)};
  const remove=()=>{if(!selected)return;commit();setNodes(v=>v.filter(n=>n.id!==selected));setEdges(v=>v.filter(e=>e.from!==selected&&e.to!==selected));setSelected(null);setDeleteOpen(false)};
  const update=(patch:Partial<ThoughtNode>)=>{if(!selected)return;setNodes(v=>v.map(n=>n.id===selected?{...n,...patch}:n))};
  const exportData=(format:"json"|"md")=>{const content=format==="json"?JSON.stringify({nodes,edges},null,2):nodes.map(n=>`# ${n.title}\n\n${n.body}\n\n类型：${n.type}｜情绪：${n.mood}｜标签：${n.tags.join("、")}\n`).join("\n---\n\n");const blob=new Blob([content],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`远野心屋-思维星图.${format}`;a.click();URL.revokeObjectURL(a.href)};
  const importData=(file:File)=>{const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(String(reader.result));if(Array.isArray(d.nodes)&&Array.isArray(d.edges)){commit();setNodes(d.nodes);setEdges(d.edges)}}catch{alert("这份文件无法被识别。")}};reader.readAsText(file)};
  useEffect(()=>{const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,opts?:unknown)=>void}}).modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();try{context.registerTool({name:"create_thought_node",title:"写入一个念头",description:"在远野心屋的思维星图中创建一个新节点。",inputSchema:{type:"object",properties:{title:{type:"string"},body:{type:"string"}},required:["title"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input:unknown)=>{const v=input as {title:string;body?:string};if(!v.title?.trim())throw new Error("标题不能为空");const id=addNode(800+Math.random()*100,450+Math.random()*100,v.title.trim());setNodes(old=>old.map(n=>n.id===id?{...n,body:v.body||""}:n));return{id,title:v.title}}},{signal:lifecycle.signal})}catch{}return()=>lifecycle.abort()},[addNode]);
  const filtered=useMemo(()=>new Set(nodes.filter(n=>(n.title+n.body+n.tags.join(" ")).toLowerCase().includes(search.toLowerCase())).map(n=>n.id)),[nodes,search]);
  return <section className="roxy-stars absolute inset-0 z-50 overflow-hidden bg-[#0b1025]/80">
    <div className="star-roxy-photo" aria-hidden="true"><img src="/roxy/IMG_5864.PNG" alt=""/></div>
    <RoxyDialogue scene="stars" compact><SceneAction primary onClick={()=>addNode()}><Plus size={17}/>和 Roxy 点亮一颗星</SceneAction></RoxyDialogue>
    <div className="pointer-events-none absolute inset-0 opacity-60" style={{backgroundImage:"radial-gradient(#c9d7c9 0.6px,transparent 0.8px)",backgroundSize:"44px 44px"}}/>
    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 sm:p-6"><button onClick={onBack} className="flex items-center gap-2 text-sm text-white/65"><ArrowLeft size={16}/>回到书桌</button><p className="hidden text-xs tracking-[.28em] text-white/40 sm:block">思维星图 · 本地自动保存</p></header>
    <div className="star-toolbar glass absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full p-1.5">
      <IconButton label="新增节点" onClick={()=>addNode()}><Plus size={16}/></IconButton><IconButton label="撤销" onClick={undo}><RotateCcw size={16}/></IconButton><IconButton label="重做" onClick={redo}><RotateCw size={16}/></IconButton><IconButton label="缩小" onClick={()=>setZoom(z=>Math.max(.35,z-.1))}><ZoomOut size={16}/></IconButton><span className="w-10 text-center text-xs text-white/50">{Math.round(zoom*100)}%</span><IconButton label="放大" onClick={()=>setZoom(z=>Math.min(1.6,z+.1))}><ZoomIn size={16}/></IconButton><IconButton label="时间流逝" onClick={()=>setTimeline(v=>!v)} className={timeline?"border-[#e0bd7a]/70 bg-[#b27b38]/35":""}><CalendarDays size={16}/></IconButton>
      <label className="relative ml-1 hidden sm:block"><Search className="absolute left-3 top-2.5 text-white/35" size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="寻找一个念头" className="h-10 w-44 rounded-full border border-white/10 bg-black/20 pl-9 pr-3 text-sm outline-none placeholder:text-white/30"/></label>
    </div>
    <div ref={mapRef} className="absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing" onDoubleClick={e=>{if((e.target as HTMLElement).closest(".node"))return;const r=mapRef.current!.getBoundingClientRect();addNode((e.clientX-r.left-pan.x)/zoom,(e.clientY-r.top-pan.y)/zoom)}} onPointerDown={e=>{if(!(e.target as HTMLElement).closest(".node")){e.currentTarget.setPointerCapture(e.pointerId);lastPointer.current={x:e.clientX,y:e.clientY};setPanning(true)}}} onPointerMove={e=>{if(drag)setNodes(v=>v.map(n=>n.id===drag?{...n,x:n.x+e.movementX/zoom,y:n.y+e.movementY/zoom}:n));else if(panning){const dx=e.clientX-lastPointer.current.x,dy=e.clientY-lastPointer.current.y;lastPointer.current={x:e.clientX,y:e.clientY};setPan(v=>({x:v.x+dx,y:v.y+dy}))}}} onPointerUp={()=>{setDrag(null);setPanning(false)}}>
      <div className="absolute left-0 top-0 h-[900px] w-[1600px] origin-top-left" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
        <svg className="absolute inset-0 h-full w-full overflow-visible">{edges.map(e=>{const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);if(!a||!b)return null;return <path key={e.id} d={`M${a.x+85},${a.y+28} C${(a.x+b.x)/2+85},${a.y+28} ${(a.x+b.x)/2+85},${b.y+28} ${b.x+85},${b.y+28}`} fill="none" stroke={selected===e.from||selected===e.to?"#dbb96e99":"#9db2aa45"} strokeWidth={selected===e.from||selected===e.to?2:1.2}/>} )}</svg>
        {nodes.map((n,i)=><button key={n.id} onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);commit();setDrag(n.id)}} onClick={()=>nodeClick(n.id)} className={`node absolute min-h-14 w-[170px] rounded-2xl border bg-[#101b1a]/90 px-4 py-3 text-left shadow-xl backdrop-blur ${selected===n.id?"selected":""}`} style={{left:n.x,top:n.y,borderColor:n.important?`${typeColor[n.type]}aa`:undefined,opacity:search&&!filtered.has(n.id)?.25:timeline?Math.max(.3,1-i*.1):1}}><span className="mb-1 flex items-center gap-2 text-[.68rem] tracking-[.16em]" style={{color:typeColor[n.type]}}><i className="h-1.5 w-1.5 rounded-full bg-current"/>{n.type}{n.important&&" · 恒星"}</span><strong className="block font-normal leading-6 tracking-[.05em]">{n.title}</strong></button>)}
      </div>
    </div>
    <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 text-center text-[.68rem] tracking-[.1em] text-white/35">双击空白处新建 · 拖动节点移动 · 选择节点后建立关联</div>
    {selectedNode&&<aside className="glass fade-in absolute bottom-4 right-4 z-40 w-[min(22rem,calc(100%-2rem))] rounded-2xl p-5 sm:bottom-6 sm:right-6">
      <div className="mb-4 flex items-center justify-between"><span className="text-xs tracking-[.2em]" style={{color:typeColor[selectedNode.type]}}>{selectedNode.type}</span><div className="flex gap-1"><IconButton label={linkFrom?"取消连接":"从此节点建立连接"} onClick={()=>setLinkFrom(linkFrom?null:selectedNode.id)} className={linkFrom?"border-[#e0bd7a]":""}><Link2 size={15}/></IconButton><IconButton label="删除节点" onClick={()=>setDeleteOpen(true)}><Trash2 size={15}/></IconButton><IconButton label="关闭详情" onClick={()=>setSelected(null)}><X size={15}/></IconButton></div></div>
      {linkFrom&&<p className="mb-3 rounded-lg bg-[#d4a35c]/10 p-2 text-xs text-[#e7c889]">现在选择另一个节点，建立关联。</p>}
      <input value={selectedNode.title} onChange={e=>update({title:e.target.value})} className="mb-3 w-full border-0 border-b border-white/15 bg-transparent pb-3 text-lg outline-none"/>
      <textarea value={selectedNode.body} onChange={e=>update({body:e.target.value})} placeholder="写下这颗星所承载的内容……" className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/15 p-3 text-sm leading-6 outline-none placeholder:text-white/25"/>
      <div className="mt-3 grid grid-cols-2 gap-2"><select value={selectedNode.type} onChange={e=>update({type:e.target.value as NodeType})} className="rounded-lg border border-white/10 bg-[#17211e] p-2 text-xs">{Object.keys(typeColor).map(t=><option key={t}>{t}</option>)}</select><input value={selectedNode.mood} onChange={e=>update({mood:e.target.value})} className="rounded-lg border border-white/10 bg-black/15 p-2 text-xs" placeholder="情绪"/></div>
      <input value={selectedNode.tags.join("，")} onChange={e=>update({tags:e.target.value.split(/[，,]/).filter(Boolean)})} className="mt-2 w-full rounded-lg border border-white/10 bg-black/15 p-2 text-xs" placeholder="标签，以逗号分隔"/>
      <label className="mt-3 flex items-center justify-between text-xs text-white/60">固定为恒星<Switch size="sm" checked={!!selectedNode.important} onCheckedChange={v=>update({important:v})}/></label>
    </aside>}
    <div className="absolute bottom-5 left-5 z-30 hidden gap-1 sm:flex"><label className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-white/15 bg-black/25" title="导入 JSON"><Upload size={15}/><input type="file" accept="application/json" className="hidden" onChange={e=>e.target.files?.[0]&&importData(e.target.files[0])}/></label><IconButton label="导出 JSON" onClick={()=>exportData("json")}><Download size={15}/></IconButton><IconButton label="导出 Markdown" onClick={()=>exportData("md")}><BookOpen size={15}/></IconButton></div>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="border-white/15 bg-[#17211e] text-[#f4eedf]"><AlertDialogHeader><AlertDialogTitle>让这颗星离开？</AlertDialogTitle><AlertDialogDescription className="text-white/55">节点与它的所有连接将被删除。这个动作仍可通过“撤销”找回。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>留下它</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={remove}>确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
