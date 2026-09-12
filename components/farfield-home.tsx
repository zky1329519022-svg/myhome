"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookOpen, CalendarDays, CloudRain, Download, Home, Link2, Maximize2,
  MoonStar, Music2, Plus, RotateCcw, RotateCw, Search, Settings2, Sparkles,
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
  const useRoomBg = !outside && scene !== "stars";

  return (
    <main className={`${weather==="rain"?"scene-rain":"scene-sun"} ${reduced?"reduced-motion":""} ${contrast?"high-contrast":""} relative h-[100svh] w-screen overflow-hidden bg-[#0b1210]`} onPointerMove={e=>!reduced&&setPointer({x:(e.clientX/innerWidth-.5)*10,y:(e.clientY/innerHeight-.5)*8})}>
      {scene!=="stars" && <img src={outside?"/farfield-outdoor.png":"/cabin-interior.png"} alt={outside?"远山草地、一位独坐的人与一间亮着灯的小木屋":"有壁炉、扶手椅和窗边书桌的木屋室内"} className={`scene-bg ${outside?"outdoor-bg":""}`} style={{transform:`scale(${useRoomBg?1.025:1.01}) translate(${pointer.x*.45}px,${pointer.y*.4}px)`}} />}
      {outside && <div className="outdoor-depth" aria-hidden="true">
        <div className="outdoor-depth-layer outdoor-mid"><img src="/farfield-outdoor.png" alt="" className="depth-img" style={{transform:`scale(1.035) translate(${pointer.x*1.25}px,${pointer.y*1.05}px)`}} /></div>
        <div className="outdoor-depth-layer outdoor-near"><img src="/farfield-outdoor.png" alt="" className="depth-img" style={{transform:`scale(1.065) translate(${pointer.x*2.1}px,${pointer.y*1.75}px)`}} /></div>
      </div>}
      {scene!=="stars" && <><div className="vignette"/><div className="rain"/><div className="dust absolute inset-0 opacity-20 pointer-events-none"/></>}

      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between p-4 sm:p-6">
        <button onClick={()=>go("outdoor")} className="flex items-center gap-3 text-left text-[#f4ead5] drop-shadow-lg" aria-label="回到远野">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/20 backdrop-blur"><Home size={17}/></span>
          <span><b className="block text-[.95rem] font-normal tracking-[.28em]">远野心屋</b><small className="hidden text-[.68rem] tracking-[.18em] text-white/55 sm:block">FARFIELD MIND HOUSE</small></span>
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

      {outside && <Outdoor onEnter={()=>go("interior")} />}
      {room && <Interior onReading={()=>go("reading")} onDesk={()=>go("desk")} onOutside={()=>go("outdoor")} weather={weather}/>} 
      {scene==="reading" && <Reading onBack={()=>go("interior")} />}
      {scene==="desk" && <Desk onBack={()=>go("interior")} onGo={go}/>} 
      {scene==="write" && <QuickWrite onBack={()=>go("desk")} onStars={()=>go("stars")} />}
      {scene==="review" && <Review onBack={()=>go("desk")} />}
      {scene==="library" && <Library onBack={()=>go("desk")} onReading={()=>go("reading")} />}
      {scene==="stars" && <StarMap onBack={()=>go("desk")} />}

      {!outside && scene!=="stars" && <div className="ember pointer-events-none absolute bottom-[15%] left-[12%] z-10 h-36 w-36 rounded-full bg-[#ef8e2b]/20 blur-3xl"/>}
    </main>
  );
}

function Outdoor({onEnter}:{onEnter:()=>void}) {
  return <section className="outdoor-stage absolute inset-0 z-20">
    <div className="absolute bottom-[8%] left-[6%] max-w-[28rem] text-[#f3ead8] drop-shadow-[0_3px_14px_#000] sm:bottom-[10%] sm:left-[8%]">
      <p className="mb-3 text-xs tracking-[.32em] text-white/55">远野 · 无人来访的下午</p>
      <h1 className="text-[clamp(1.25rem,2.2vw,2rem)] font-normal leading-relaxed tracking-[.08em]">这里没有答案，<br/>只有正在生长的念头。</h1>
    </div>
    <div className="entry-guide" aria-hidden="true">
      <span>沿灯光而行</span>
      <svg viewBox="0 0 260 118" preserveAspectRatio="none"><path d="M4 17 C 74 12, 128 39, 164 69 S 218 96, 250 105"/><circle cx="251" cy="105" r="3"/></svg>
    </div>
    <button className="entry-beacon" data-label="进入木屋" aria-label="进入小木屋" onClick={onEnter}><Home size={14}/><span>进入木屋</span></button>
    <p className="outdoor-depth-note absolute bottom-5 right-5 text-[.68rem] tracking-[.2em] text-white/45">移动视线，靠近那束暖光</p>
  </section>;
}

function Interior({onReading,onDesk,onOutside,weather}:{onReading:()=>void;onDesk:()=>void;onOutside:()=>void;weather:Weather}) {
  return <section className="fade-in absolute inset-0 z-20">
    <div className="absolute bottom-7 left-6 max-w-xs drop-shadow-xl sm:bottom-10 sm:left-[6%]"><p className="text-xs tracking-[.26em] text-[#e8c895]/65">木屋 · {weather==="rain"?"雨落在窗上":"天光越过窗沿"}</p><h1 className="mt-2 text-xl font-normal tracking-[.12em]">火正好，夜还很长。</h1></div>
    <button className="hotspot left-[1%] top-[36%] h-[49%] w-[28%]" data-label="坐下阅读" aria-label="在壁炉边坐下阅读" onClick={onReading}/>
    <button className="hotspot right-[4%] top-[37%] h-[48%] w-[48%]" data-label="在窗边写作" aria-label="走到窗边书桌" onClick={onDesk}/>
    <button onClick={onOutside} className="absolute bottom-6 right-6 flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-xs tracking-[.15em] backdrop-blur transition hover:bg-black/45"><ArrowLeft size={14}/>返回户外</button>
  </section>;
}

function Reading({onBack}:{onBack:()=>void}) {
  const [page,setPage]=useState(0); const [focus,setFocus]=useState(false);
  const item=readings[page];
  return <section className={`absolute inset-0 z-30 grid place-items-center bg-[#090c0a]/${focus?"95":"62"} p-4 backdrop-blur-[2px]`}>
    <button onClick={onBack} className="absolute left-5 top-24 flex items-center gap-2 text-sm text-white/65 hover:text-white"><ArrowLeft size={16}/>离开扶手椅</button>
    <article key={page} className="page-turn relative mt-10 w-[min(48rem,94vw)] rounded-[1.5rem_2.5rem_2.5rem_1.5rem] border border-[#cdb887]/30 bg-[linear-gradient(100deg,#bba77d_0,#e4d5b3_5%,#efe3c7_53%,#d6c19b_100%)] px-[clamp(1.5rem,6vw,5rem)] py-[clamp(2.4rem,8vh,5.5rem)] text-[#332a20] shadow-[0_30px_100px_#000c,inset_18px_0_30px_#6b543c25]">
      <div className="mb-10 flex items-center justify-between border-b border-[#4d3e2a]/20 pb-4 text-xs tracking-[.24em] text-[#695943]"><span>{item.kind}</span><span>{item.date}</span></div>
      <h2 className="mb-7 text-2xl tracking-[.15em] sm:text-3xl">{item.title}</h2><p className="min-h-40 text-[1.05rem] leading-9 tracking-[.06em] sm:text-lg">{item.text}</p>
      <div className="mt-10 flex items-center justify-between"><button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="disabled:opacity-25">前一页</button><span className="text-xs">— {page+1} / {readings.length} —</span><button disabled={page===readings.length-1} onClick={()=>setPage(p=>p+1)} className="disabled:opacity-25">后一页</button></div>
    </article>
    <div className="absolute bottom-5 flex gap-2"><button onClick={()=>setPage(Math.floor(Math.random()*readings.length))} className="rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs tracking-[.12em]">随机翻开一页</button><IconButton label={focus?"退出专注":"专注阅读"} onClick={()=>setFocus(v=>!v)}><Maximize2 size={15}/></IconButton></div>
  </section>;
}

function Desk({onBack,onGo}:{onBack:()=>void;onGo:(s:Scene)=>void}) {
  return <section className="fade-in absolute inset-0 z-30 bg-[#060a08]/25">
    <button onClick={onBack} className="absolute left-5 top-24 flex items-center gap-2 text-sm text-white/70"><ArrowLeft size={16}/>离开书桌</button>
    <div className="absolute left-1/2 top-[17%] -translate-x-1/2 text-center drop-shadow-xl"><p className="text-xs tracking-[.3em] text-white/55">窗边书桌</p><h1 className="mt-3 text-xl font-normal tracking-[.16em]">让一个念头，在这里停留。</h1></div>
    <DeskItem className="bottom-[25%] left-[41%] h-[26%] w-[18%] -rotate-2" label="摊开的纸 · 写下一念" icon={<Sparkles size={18}/>} onClick={()=>onGo("write")}/>
    <DeskItem className="bottom-[21%] right-[7%] h-[34%] w-[22%] rotate-2" label="星图仪 · 思维星图" icon={<MoonStar size={18}/>} onClick={()=>onGo("stars")}/>
    <DeskItem className="bottom-[18%] left-[30%] h-[17%] w-[10%]" label="日历 · 今日回望" icon={<CalendarDays size={18}/>} onClick={()=>onGo("review")}/>
    <DeskItem className="bottom-[14%] right-[27%] h-[15%] w-[14%]" label="旧书 · 记忆书架" icon={<BookOpen size={18}/>} onClick={()=>onGo("library")}/>
  </section>;
}
function DeskItem({className,label,icon,onClick}:{className:string;label:string;icon:React.ReactNode;onClick:()=>void}) { return <button onClick={onClick} aria-label={label} className={`group absolute rounded-2xl border border-transparent transition hover:border-[#f0c779]/55 hover:bg-[#e9ac4a]/10 hover:shadow-[0_0_50px_#eaa94e25] ${className}`}><span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 translate-y-3 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">{icon}{label}</span></button> }

function Panel({title,kicker,onBack,children}:{title:string;kicker:string;onBack:()=>void;children:React.ReactNode}) { return <section className="absolute inset-0 z-30 grid place-items-center bg-[#070b09]/76 p-4 backdrop-blur-md"><button onClick={onBack} className="absolute left-5 top-24 flex items-center gap-2 text-sm text-white/65"><ArrowLeft size={16}/>回到书桌</button><div className="glass fade-in mt-12 max-h-[78vh] w-[min(44rem,94vw)] overflow-auto rounded-3xl p-[clamp(1.5rem,4vw,3.5rem)]"><p className="text-xs tracking-[.28em] text-[#d6ad71]/65">{kicker}</p><h1 className="mb-8 mt-3 text-2xl font-normal tracking-[.16em]">{title}</h1>{children}</div></section> }

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
  return <section className="absolute inset-0 z-50 overflow-hidden bg-[radial-gradient(circle_at_52%_45%,#1a2926_0,#0b1314_47%,#070b0c_100%)]">
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
