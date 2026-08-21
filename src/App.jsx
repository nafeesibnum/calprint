import { useState, useRef, useEffect } from "react";
const K="#1A1A2E",C="#00AEEF",M="#D4006E",Y="#F5C800";
const CL="#E0F7FF",ML="#FFE0F0";
const BG="#F4F4F4",CARD="#fff",T="#1A1A1A",MT="#6B7280",BD="#E5E7EB";
const SUC="#059669",ERR="#DC2626",WARN="#D97706";
const Bar=()=><div style={{height:"3px",background:`linear-gradient(90deg,${C},${M},${Y},${K})`,flexShrink:0}}/>;
const LAM={"Thermal Matt":0.06,"Gloss":0.05,"Matt":0.055,"Spot UV":0.08,"Velvet":0.07};
const PLATES={"GTO":{mW:356,mH:508,rate:750},"GTO52":{mW:360,mH:520,rate:750},"KORD":{mW:460,mH:640,rate:800},"Heidelberg":{mW:480,mH:650,rate:900}};
const PAPERS=[{n:"SRA3 12.60\"×17.72\"",w:450,h:320},{n:"A3 16.54\"×11.69\"",w:420,h:297},{n:"A4 11.69\"×8.27\"",w:297,h:210},{n:"10.6\"×8.33\"",w:269,h:212},{n:"8\"×5\"",w:203,h:127},{n:"40\"×25\"",w:1016,h:635},{n:"SRA2",w:640,h:450},{n:"Custom",w:0,h:0}];
const COLS_OPTS=["1 Color","2 Colors","3 Colors","4 Colors","4C+1 Spot","4C+2 Spot"];
const nC=s=>s[0]==="1"?1:s[0]==="2"?2:s[0]==="3"?3:4;
const m2i=v=>parseFloat((v/25.4).toFixed(3));const i2m=v=>Math.round(parseFloat(v||0)*25.4*100)/100;
const fmt=v=>Number(v).toLocaleString();const cr=s=>Math.ceil(s/1000)*1000;
const BIND_RATES={"Perfect":1.5,"Saddle Stitch":0.8,"Spiral":2.0,"Hard Cover":5.0};
const FOLD_RATES={"Half Fold":150,"Tri Fold":200,"Z Fold":220,"Gate Fold":300};
const SETTINGS_PRINT_RATE=1200; // Rs/plate — comes from the Settings page (not editable in Plan Sheet)
// ── Settings defaults (seeded from the Settings page mockup) — everything the calculation
// depends on lives here, editable from the Settings screen, not inline in Plan Sheet.
const DEF_PRODUCTS=["Visiting Card","Bill Books","UW Box","Hang Tags"];
const DEF_PAPERS=[
  {id:1,name:"Bank Paper 80gsm",gsm:80,l:914.4,w:609.6,packPrice:8500,packSheets:500,
    sheetSizes:[{l:609.6,w:457.2},{l:304.8,w:228.6},{l:304.8,w:203.2},{l:152.4,w:152.4}]}, // 24x18, 12x9, 12x8, 6x6
  {id:2,name:"Art Paper 100gsm",gsm:100,l:914.4,w:609.6,packPrice:9000,packSheets:500,
    sheetSizes:[{l:609.6,w:457.2},{l:457.2,w:304.8}]}, // 24x18, 18x12
  {id:3,name:"Box Board 300gsm",gsm:300,l:787.4,w:1092.2,packPrice:15000,packSheets:250,
    sheetSizes:[{l:546.1,w:393.7},{l:393.7,w:273.05}]},
  {id:4,name:"Art Board 310gsm",gsm:310,l:635,w:1117.6,packPrice:16000,packSheets:250,
    sheetSizes:[{l:558.8,w:317.5},{l:317.5,w:254},{l:211.6,w:203.2},{l:158.75,w:127}]}, // 22x12.5, 12.5x10, 8.33x8, 6.25x5
];
const DEF_PLATES=[
  {id:1,name:"GTO52",maxL:520,maxW:360,minL:180,minW:105,printL:505,printW:340,grip:38.1,impRate:750},
  {id:2,name:"GTO46",maxL:460,maxW:320,minL:180,minW:105,printL:445,printW:310,grip:38.1,impRate:650},
  {id:3,name:"KORD64",maxL:640,maxW:460,minL:180,minW:140,printL:625,printW:445,grip:38.1,impRate:1200},
  {id:4,name:"Hand Platen",maxL:460,maxW:330,minL:100,minW:100,printL:440,printW:315,grip:25.4,impRate:650},
];
const DEF_SHEET_PRESETS=[{l:317.5,w:254},{l:254,w:158.75},{l:211.6,w:203.2},{l:127,w:203.2}]; // 12.5x10, 10x6.25, 8.33x8, 5x8 (inch→mm)
const DEF_LAMINATES=[{name:"Gloss",rate:0.03},{name:"Matt",rate:0.04},{name:"Thermal Matt",rate:0.06}];
const DEF_POSITIVE_RATE=2.00; // Rs/sq.in per color (e.g. 4 Color → 4×2=8/sq.in)
const DEF_DIECUTTERS=[{id:1,name:"Kord",impRate:1200},{id:2,name:"Hand Platen",impRate:650}];
const DEF_RIMMING_RATE=2.5; // Rs/sheet (simple default, editable in Settings)
// Buffered length input: shows exactly what the person is typing (no mid-edit reformatting/rounding),
// only snapping to the canonical formatted value on blur. Fixes values like typing "1" and seeing "0.98"
// caused by controlled inputs re-formatting through a lossy mm<->inch round-trip on every keystroke.
// Parses plain numbers plus fractions ("43/4" -> 10.75) and mixed numbers ("3 1/2" -> 3.5).
const parseNum=raw=>{
  const s=String(raw).trim();
  if(!s)return NaN;
  const mixed=s.match(/^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if(mixed){const w=parseFloat(mixed[1]),n=parseFloat(mixed[2]),d=parseFloat(mixed[3]);
    if(!d)return NaN;return w+(w<0?-1:1)*(n/d);}
  const frac=s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if(frac){const n=parseFloat(frac[1]),d=parseFloat(frac[2]);return d?n/d:NaN;}
  return parseFloat(s);
};
const NumField=({unit,mm,onMM,style,placeholder,readOnly})=>{
  const[buf,setBuf]=useState(null);
  const fmtVal=v=>unit==="inch"?(Math.round((v/25.4)*100)/100).toFixed(2):(Math.round(v*100)/100).toString();
  if(readOnly)return<input value={fmtVal(mm)} readOnly style={style} placeholder={placeholder}/>;
  return<input value={buf!==null?buf:fmtVal(mm)}
    onFocus={()=>setBuf(fmtVal(mm))}
    onChange={e=>{const raw=e.target.value;setBuf(raw);
      const n=parseNum(raw);if(!isNaN(n))onMM(unit==="inch"?n*25.4:n);}}
    onBlur={()=>setBuf(null)}
    style={style} placeholder={placeholder}/>;
};
// Same buffering approach as NumField but for plain numbers (no mm<->unit conversion) —
// qty, rates, page counts, percentages, etc. Keeps every field freely typeable.
const FreeNum=({val,onVal,style,placeholder})=>{
  const[buf,setBuf]=useState(null);
  return<input value={buf!==null?buf:(val===0?"":String(val))}
    onFocus={()=>setBuf(val===0?"":String(val))}
    onChange={e=>{const raw=e.target.value;setBuf(raw);
      const n=parseNum(raw);if(!isNaN(n))onVal(n);}}
    onBlur={()=>setBuf(null)}
    style={style} placeholder={placeholder}/>;
};
// Small option toggle (2 per row). Module-scope (not redefined inside App on every render) so
// any input nested inside stays mounted — a redefined-per-render component forces React to
// remount its subtree every render, which drops focus and buffered edit state.
const Tog=({lbl,on,cb,col,sub})=>(
  <div onClick={cb} style={{display:"flex",alignItems:"center",gap:"6px",cursor:"pointer",
    padding:"5px 8px",background:on?col+"18":BG,borderRadius:"7px",
    border:`1.5px solid ${on?col:BD}`,flex:1,minWidth:0}}>
    <div style={{width:"13px",height:"13px",border:`2px solid ${on?col:BD}`,borderRadius:"3px",
      background:on?col:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {on&&<span style={{color:"#fff",fontSize:"9px",lineHeight:1}}>✓</span>}
    </div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:"11px",fontWeight:"700",color:on?col:T,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lbl}</div>
      {sub&&<div style={{fontSize:"9px",color:MT,marginTop:"1px"}}>{sub}</div>}
    </div>
  </div>
);
const CostRow=({lbl,val,set,hasDD,ddOpts,ddKey,setDdk,hasPlus,note})=>(
  <div style={{marginBottom:"6px"}}>
    <div style={{fontSize:"10px",color:MT,fontWeight:"600",marginBottom:"2px"}}>{lbl}{note&&<span style={{color:C,marginLeft:"4px"}}>{note}</span>}</div>
    <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
      {hasDD&&<select value={ddKey} onChange={e=>setDdk(e.target.value)}
        style={{flex:1,padding:"6px 4px",border:`1.5px solid ${BD}`,borderRadius:"7px",
        fontSize:"12px",outline:"none",background:CARD,boxSizing:"border-box"}}>
        {ddOpts.map(o=><option key={o}>{o}</option>)}
      </select>}
      <FreeNum val={val} onVal={set}
        style={{flex:hasDD?0:1,width:hasDD?"90px":"100%",padding:"6px 8px",
        border:`1.5px solid ${BD}`,borderRadius:"7px",fontSize:"12px",fontWeight:"700",
        outline:"none",boxSizing:"border-box",textAlign:"right"}}
        placeholder="0.00"/>
      {hasPlus&&<button style={{background:K,border:"none",borderRadius:"6px",
        padding:"5px 8px",color:"#fff",fontWeight:"800",cursor:"pointer",fontSize:"13px",
        flexShrink:0}}>+</button>}
    </div>
  </div>
);
// Optional cost line: collapses to a tap-to-enable text label until toggled on, then behaves like
// CostRow with an "×" to disable again. Used for every non-compulsory calculation field.
const OptCostRow=({lbl,val,set,enabled,onToggle,hasDD,ddOpts,ddKey,setDdk,hasPlus})=>
  !enabled?(
    <button onClick={onToggle} style={{display:"block",width:"100%",textAlign:"left",
      background:"none",border:"none",padding:"5px 0",color:C,fontSize:"11px",fontWeight:"700",
      cursor:"pointer",borderBottom:"1px dashed #F3F4F6",marginBottom:"6px"}}>+ {lbl}</button>
  ):(
    <div style={{marginBottom:"6px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2px"}}>
        <span style={{fontSize:"10px",color:MT,fontWeight:"600"}}>{lbl}</span>
        <button onClick={()=>{onToggle();set(0);}} style={{background:"none",border:"none",
          color:ERR,fontSize:"12px",cursor:"pointer",fontWeight:"700",padding:0}}>✕</button>
      </div>
      <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
        {hasDD&&<select value={ddKey} onChange={e=>setDdk(e.target.value)}
          style={{flex:1,padding:"6px 4px",border:`1.5px solid ${BD}`,borderRadius:"7px",
          fontSize:"12px",outline:"none",background:CARD,boxSizing:"border-box"}}>
          {ddOpts.map(o=><option key={o}>{o}</option>)}
        </select>}
        <FreeNum val={val} onVal={set}
          style={{flex:hasDD?0:1,width:hasDD?"90px":"100%",padding:"6px 8px",
          border:`1.5px solid ${BD}`,borderRadius:"7px",fontSize:"12px",fontWeight:"700",
          outline:"none",boxSizing:"border-box",textAlign:"right"}}
          placeholder="0.00"/>
        {hasPlus&&<button style={{background:K,border:"none",borderRadius:"6px",
          padding:"5px 8px",color:"#fff",fontWeight:"800",cursor:"pointer",fontSize:"13px",
          flexShrink:0}}>+</button>}
      </div>
    </div>
  );
// Best-fit cols/rows/ups for a job size (jw×jh) on a paper (pw×ph), trying both orientations
// Reads a PDF's page count and first page's trim size directly from its raw bytes —
// no external library needed. Works for standard (non-encrypted) PDFs by scanning for
// /Type /Page objects and /MediaBox entries (page size, in points).
// Derives sensible sheet sizes by cutting a paper into even pieces (halves, thirds, quarters...) —
// e.g. a 24×36 paper suggests 24×18, 12×9, 12×8, 6×6 etc. Verified against real examples.
const deriveSheetSizes=(paperL,paperW)=>{
  const seen=new Set();const out=[];
  for(let i=1;i<=6;i++)for(let j=1;j<=6;j++){
    const l=paperL/i,w=paperW/j;
    if(l<40||w<40)continue;
    const big=Math.max(l,w),small=Math.min(l,w);
    const key=Math.round(big*10)+"x"+Math.round(small*10);
    if(!seen.has(key)){seen.add(key);out.push({l:big,w:small,pieces:i*j});}
  }
  out.sort((a,b)=>a.pieces-b.pieces); // simplest cuts (fewest pieces) first
  return out;
};
const parsePdfInfo=async(file)=>{
  const buf=await file.arrayBuffer();
  const bytes=new Uint8Array(buf);
  let str="";
  for(let i=0;i<bytes.length;i++)str+=String.fromCharCode(bytes[i]); // latin1-style 1:1 byte mapping
  const pageMatches=str.match(/\/Type\s*\/Page(?!s)/g)||[];
  const mbMatches=[...str.matchAll(/\/MediaBox\s*\[\s*([\-\d.]+)\s+([\-\d.]+)\s+([\-\d.]+)\s+([\-\d.]+)\s*\]/g)];
  if(!mbMatches.length)return null;
  const[,x0,y0,x1,y1]=mbMatches[0];
  const wPt=Math.abs(parseFloat(x1)-parseFloat(x0)),hPt=Math.abs(parseFloat(y1)-parseFloat(y0));
  const wMM=wPt*0.3527777778,hMM=hPt*0.3527777778; // 1 pt = 1/72 inch = 0.3527...mm
  return{pageCount:Math.max(pageMatches.length,1),pageWMM:wMM,pageHMM:hMM};
};
const fitCalc=(pw,ph,grip,em,gap,jw,jh)=>{
  const c1=Math.floor((pw-2*em)/(jw+gap)),r1=Math.floor((ph-grip-em)/(jh+gap));
  const u1=Math.max(c1,0)*Math.max(r1,0);
  const c2=Math.floor((pw-2*em)/(jh+gap)),r2=Math.floor((ph-grip-em)/(jw+gap));
  const u2=Math.max(c2,0)*Math.max(r2,0);
  return u2>u1?{cols:Math.max(c2,0),rows:Math.max(r2,0),ups:u2,rot:true}
              :{cols:Math.max(c1,0),rows:Math.max(r1,0),ups:u1,rot:false};
};
// Plain guillotine cut count: how many blank sheets (sw×sh) come out of one raw paper (pw×ph).
// No gripper margin and no inter-item gap — that's a press-imposition concept, not a straight cut.
const sheetsFromPaper=(pw,ph,sw,sh)=>{
  const c1=Math.floor(pw/sw),r1=Math.floor(ph/sh),u1=c1*r1;
  const c2=Math.floor(pw/sh),r2=Math.floor(ph/sw),u2=c2*r2;
  return u2>u1?{cols:c2,rows:r2,ups:Math.max(u2,1),rot:true}
              :{cols:c1,rows:r1,ups:Math.max(u1,1),rot:false};
};
// Per-signature calc for the Multiple Sheets tab: pages→runs→plates→plate cost,
// and sheets-needed→papers-needed (via best-fit of sheet size on raw paper)→paper cost.
// Any m* field on the signature overrides the computed value (used when Manual Calculation is on).
const sigCalc=(sig,effQty)=>{
  const pps=Math.max(sig.pagesPerSheet,1);
  const groups=(sig.groups||[]).map(g=>{
    const runs=g.pages>0?Math.ceil(g.pages/pps):0;
    const plates=runs*g.colors;
    return{...g,runs,plates};
  });
  const totalRuns=groups.reduce((a,g)=>a+g.runs,0);
  const isFB=sig.side==="Front&Back";
  // Front&Back overrides the group color breakdown with a simple front+back color count —
  // same total run count (sheets unaffected), just a different color/plate total.
  const totalPlates=isFB?totalRuns*((sig.frontColors||4)+(sig.backColors||1)):groups.reduce((a,g)=>a+g.plates,0);
  const bothSide=sig.side&&sig.side!=="Single Side"; // Back&Back or Front&Back
  const plateCost=totalPlates*(sig.plateRate||0);
  // Both-side modes pair runs onto shared sheets (front+back on one physical sheet, or mirrored
  // back&back for an odd leftover run) — this halves sheets needed either way. Verified against
  // real worked examples: 1000 books, 216 pages, 8 pages/sheet, 1 color → 27 runs → 13,500 sheets
  // (=27×1000/2), 27 plates, and Rs.32,400 impression cost — matches exactly for both Front&Back
  // and pure Back&Back, since both reduce to the same run-pairing math.
  const sheetsNeeded=bothSide?Math.ceil(totalRuns*effQty/2):totalRuns*effQty;
  // Impression cost: every plate costs the same charged-quantity rate, regardless of side mode —
  // cr(effQty)/1000 × plateRate per plate, summed across all plates.
  const impressions=totalPlates*cr(effQty);
  const impressionCost=totalPlates*(cr(effQty)/1000)*(sig.plateRate||0);
  const fit=sheetsFromPaper(sig.paperW,sig.paperH,sig.sheetW,sig.sheetH);
  const perPaper=Math.max(fit.ups,1);
  const noOfPapers=Math.ceil(sheetsNeeded/perPaper);
  const paperCost=noOfPapers*(sig.paperRate||0);
  return{groups,totalPlates,totalRuns,impressions,impressionCost,
    plateCost,sheetsNeeded,noOfPapers,paperCost,fit,perPaper};
};

export default function App(){
  const[screen,setScreen]=useState("plan"); // "plan" | "settings"
  const[settings,setSettings]=useState({
    products:DEF_PRODUCTS,
    papers:DEF_PAPERS,
    plates:DEF_PLATES,
    sheetPresets:DEF_SHEET_PRESETS,
    laminates:DEF_LAMINATES,
    positiveRate:DEF_POSITIVE_RATE,
    dieCutters:DEF_DIECUTTERS,
    rimmingRate:DEF_RIMMING_RATE,
  });
  const[unit,setUnit]=useState("inch");
  const fs=v=>unit==="inch"?`${m2i(v).toFixed(2)}"`:`${v}mm`;
  const fv=v=>unit==="inch"?m2i(v).toFixed(2):String(v);
  const pv=v=>unit==="inch"?i2m(v):parseInt(v)||0;
  const[productName,setProductName]=useState("Certificate");
  const PRODUCT_PRESETS=["Certificate","Wedding Card","Box","Visiting Card","Letterhead","Brochure"];

  // Paper — sourced from Settings (paper size comes from settings; sheet size stays editable here)
  const paperList=[...settings.papers.map(p=>{
      const w=Math.max(p.l,p.w),h=Math.min(p.l,p.w);
      return{n:`${p.name} ${fs(w)}×${fs(h)}`,shortName:p.name,w,h,rate:p.packSheets?p.packPrice/p.packSheets:0,
        sheetSizes:p.sheetSizes||[]};
    }),{n:"+ Add New Paper",shortName:"+ Add New Paper",w:0,h:0,rate:0,sheetSizes:[],isAddNew:true}];
  const[pi,setPi]=useState(0);const[cL,setCL2]=useState(450);const[cW2,setCW2]=useState(320);
  const pp=paperList[Math.min(pi,paperList.length-1)];const isC=false;
  const pW=isC?Math.max(cL,cW2):Math.max(pp.w,pp.h);
  const pH=isC?Math.min(cL,cW2):Math.min(pp.w,pp.h);
  // Sheet size — shown next to Paper; editable override of the raw paper's working size
  // (e.g. paper gets cut down before printing). Resets back to the paper's own L/W.
  const[shOv,setShOv]=useState(null); // {l,h} override, or null = use paper's own size (ignored when Custom paper)
  const[customMode,setCustomMode]=useState(false); // explicitly chose "Custom" in the Sheet Size dropdown
  const sheetL=isC?pW:(shOv?shOv.l:pW), sheetH=isC?pH:(shOv?shOv.h:pH);
  const curSheetL=isC?cL:sheetL,curSheetH=isC?cW2:sheetH;
  // Sheet sizes come from the selected paper's own dimensions (e.g. 24×36 paper → 24×18, 12×9...),
  // not a fixed global list — falls back to Settings' Frequent Sizes only for Custom paper.
  const sheetSizeOpts=(pp.sheetSizes&&pp.sheetSizes.length)?pp.sheetSizes:deriveSheetSizes(pW,pH).slice(0,6);
  const presetIdx=sheetSizeOpts.findIndex(sp=>Math.round(sp.l)===Math.round(curSheetL)&&Math.round(sp.w)===Math.round(curSheetH));
  const sheetSizeSel=customMode?"Custom":(presetIdx>=0?String(presetIdx):"Custom");

  // Core
  const[platK,setPlatK]=useState(settings.plates[0]?.name||"GTO52");
  const pl=settings.plates.find(p=>p.name===platK)||settings.plates[0]||{impRate:750,grip:38.1};
  const[colS,setColS]=useState("4 Colors");const nc=nC(colS);
  const SIDE_OPTS=["Single Side","Back&Back - Left-Right","Back&Back - Top-Bottom","Force Back&Back","Front&Back"];
  const[sideMode,setSideMode]=useState("Single Side");
  const both=sideMode!=="Single Side";
  const isFB=sideMode==="Front&Back";
  const fBB=sideMode==="Force Back&Back";
  const bbLR=sideMode==="Back&Back - Left-Right"||fBB;
  const bbTB=sideMode==="Back&Back - Top-Bottom";
  const[fbColF,setFbColF]=useState("4 Colors");const[fbColB,setFbColB]=useState("1 Color");
  const[pGrip,setPGrip]=useState(13);
  const[jW,setJW]=useState(90);const[jH,setJH]=useState(55);
  const[qty,setQty]=useState(10000);
  const pRate=isC?5:pp.rate; // paper Rs/sheet — from Settings (pack price ÷ pack sheets)
  const[cols,setCols]=useState(7);const[rows,setRows]=useState(3);
  const[colsTouched,setColsTouched]=useState(false); // once true, stop auto-setting best cols/rows
  const[gH,setGH]=useState(3);const[gV,setGV]=useState(3);
  const[cmSz,setCmSz]=useState(3);

  // Canvas display toggles (moved into Planning Sheet card)
  const[sbs,setSbs]=useState(false); // side-by-side PLATE — unchecked by default until the person enables it
  const[cm,setCm]=useState(true);const[safe,setSafe]=useState(true);
  // Rotating the gripper side swaps Sheet L/W (the gripper itself always renders on the top/bottom edge)
  const[bk,setBk]=useState(false);
  const[warn,setWarn]=useState("");
  const[cutterFile,setCutterFile]=useState(null); // uploaded cutter-line PDF — shown as an outline only
  const[showPlan,setShowPlan]=useState(false); // Planning Sheet card hidden by default, click to reveal

  // Laminate
  const[lamK,setLamK]=useState("Thermal Matt");const[lamCust,setLamCust]=useState(null);
  const[lamBoth,setLamBoth]=useState(false); // Laminate side — Both Side doubles the laminate cost
  const lRate=lamCust!==null?lamCust:((settings.laminates.find(l=>l.name===lamK)||{}).rate||0.06);

  // Extra cost fields — Artwork/Paper/Positive/Plate/Printing/Cutting are compulsory (always shown);
  // everything else is optional and toggled on via enabledCosts.
  const[artwork,setArtwork]=useState(0);
  const[planning,setPlanning]=useState(0);
  const[positiveL,setPositiveL]=useState(0);const[positiveW,setPositiveW]=useState(0);
  const positive=m2i(positiveL)*m2i(positiveW)*settings.positiveRate*nc;
  const[cutting,setCutting]=useState(0);
  const[foilBlock,setFoilBlock]=useState(0);
  const[foiling,setFoiling]=useState(0);
  const[dieCutter,setDieCutter]=useState(0);
  const[dieCutImp,setDieCutImp]=useState(0);
  const[spotUV,setSpotUV]=useState(0);
  const[pasting,setPasting]=useState(0);
  const[foldKey,setFoldKey]=useState("Half Fold");const[folding,setFolding]=useState(0);
  const[gathering,setGathering]=useState(0);
  const[bindKey,setBindKey]=useState("Perfect");const[binding,setBinding]=useState(0);
  const[rimming,setRimming]=useState(0);
  const[dieCutMachine,setDieCutMachine]=useState(settings.dieCutters[0]?.name||"");
  const[addMat,setAddMat]=useState(0);
  const[transport,setTransport]=useState(0);
  const[stripping,setStripping]=useState(0);
  const[numbering,setNumbering]=useState(0);
  const[perforating,setPerforating]=useState(0);
  const[creasing,setCreasing]=useState(0);
  const[profit,setProfit]=useState(30);
  const[tax,setTax]=useState(0);
  const[enabledCosts,setEnabledCosts]=useState({});
  const[fieldDialog,setFieldDialog]=useState(null); // {k,l,set,val,hasDD,ddOpts,ddKey,setDdk} while adding/editing a field
  const toggleCost=k=>setEnabledCosts(p=>({...p,[`${activeTab}:${k}`]:!p[`${activeTab}:${k}`]}));

  // Booklet sheets
  const[sheets,setSheets]=useState([]);
  const[sheetModal,setSheetModal]=useState(false);
  const[newSheet,setNewSheet]=useState({type:"Text Pages",colors:"4 Colors",paper:"Art 130gsm",pages:16,rate:3.5,pageW:148,pageH:210});

  // ══ Multiple Sheets tab ══
  const[activeTab,setActiveTab]=useState("single");
  const[msProduct,setMsProduct]=useState("Text Book");
  const[msProdW,setMsProdW]=useState(210);const[msProdH,setMsProdH]=useState(297);
  const[msQty,setMsQty]=useState(1000);
  const[msMultiSheet,setMsMultiSheet]=useState(true);
  const[msMultiCopies,setMsMultiCopies]=useState(false);
  const[msCopies,setMsCopies]=useState(1);
  const[msDup,setMsDup]=useState(0);
  const[msTotalPages,setMsTotalPages]=useState(73);
  const[msUploadedPdfName,setMsUploadedPdfName]=useState(null);
  const[msPrintRate,setMsPrintRate]=useState(SETTINGS_PRINT_RATE);
  const PLAN_DEFAULTS={planCols:null,planRows:null,gapH:3,gapV:3,cutMarkSz:3,plateGrip:13,safeArea:true,cutMarksOn:true,planPageIdx:0,pageNumbers:{},sigCosts:{},minimized:true};
  const blankSig=(name)=>({id:Date.now()+Math.random(),name,paperW:pW,paperH:pH,sheetW:100,sheetH:100,paperCustomMode:true,
    pagesPerSheet:4,side:"Back&Back - Left-Right",plateRate:SETTINGS_PRINT_RATE,paperRate:5,showPlan:false,...PLAN_DEFAULTS,
    groups:[{colors:4,pages:0}]});
  const[msSigs,setMsSigs]=useState([
    {id:1,name:"Inner Pages",paperW:914.4,paperH:457.2,sheetW:584.2,sheetH:457.2,pagesPerSheet:4,paperCustomMode:true,
      side:"Back&Back - Left-Right",plateRate:SETTINGS_PRINT_RATE,paperRate:8.75,showPlan:false,...PLAN_DEFAULTS,
      groups:[{colors:1,pages:73}]},
    {id:2,name:"Cover Page",paperW:1016,paperH:635,sheetW:304.4,sheetH:254,pagesPerSheet:4,paperCustomMode:true,
      side:"Back&Back - Left-Right",plateRate:SETTINGS_PRINT_RATE,paperRate:80,showPlan:false,...PLAN_DEFAULTS,
      groups:[{colors:4,pages:4}]},
  ]);
  const addSig=()=>setMsSigs(s=>[...s,blankSig(`Paper ${s.length+1}`)]);
  // Pushes a new total page count into every non-Cover signature's first color group — shared
  // by both the PDF upload handler and manual edits to the top "No of pages" field, so both
  // paths stay in sync with the actual calculation groups (not just the top summary number).
  const syncPagesIntoGroups=(pageCount,jobWMM,jobHMM)=>{
    setMsSigs(sigs=>sigs.map(s=>{
      if(/cover/i.test(s.name))return s;
      const fit=fitCalc(s.sheetW,s.sheetH,s.plateGrip||13,5,0,jobWMM??msProdW,jobHMM??msProdH);
      const groups=s.groups&&s.groups.length?s.groups.map((g,i)=>i===0?{...g,pages:pageCount}:{...g,pages:0}):[{colors:1,pages:pageCount}];
      return{...s,groups,pagesPerSheet:Math.max(fit.ups,1)};
    }));
  };
  const rmSig=id=>setMsSigs(s=>s.length>1?s.filter(x=>x.id!==id):s);
  const updSig=(id,patch)=>setMsSigs(s=>s.map(x=>x.id===id?{...x,...patch}:x));
  // Given a new sheet size, auto-picks the smallest plate that can actually handle it (nearest
  // greater capacity, not just "a" plate), and recomputes pages/sheet from the real Job L×W fit —
  // both were previously left stale/manual, causing the plan to silently diverge from reality.
  const autoFitSheet=(sheetL,sheetH)=>{
    const candidates=settings.plates.filter(p=>p.maxL>=sheetL&&p.maxW>=sheetH);
    candidates.sort((a,b)=>(a.maxL*a.maxW)-(b.maxL*b.maxW));
    const plate=candidates[0]||settings.plates[settings.plates.length-1];
    const fit=fitCalc(sheetL,sheetH,plate?plate.grip:13,5,0,msProdW,msProdH);
    return{plateName:plate?plate.name:undefined,plateRate:plate?plate.impRate:undefined,pagesPerSheet:Math.max(fit.ups,1)};
  };
  const updGroup=(sigId,gi,patch)=>setMsSigs(s=>s.map(x=>x.id===sigId?{...x,groups:x.groups.map((g,i)=>i===gi?{...g,...patch}:g)}:x));
  const addGroup=sigId=>setMsSigs(s=>s.map(x=>x.id===sigId?{...x,groups:[...x.groups,{colors:1,pages:0}]}:x));
  const rmGroup=(sigId,gi)=>setMsSigs(s=>s.map(x=>x.id===sigId?{...x,groups:x.groups.filter((_,i)=>i!==gi)}:x));



  // Canvas
  const[mPos]=useState({}); // kept as a stable empty map — ups always render at the auto-centered position
  const[saved,setSaved]=useState(false);

  // Derived
  const eM=5;const eGH=gH;const eGV=gV;
  const exceedsPrintArea=sheetL>pl.maxL||sheetH>pl.maxW; // sheet bigger than this plate's max sheet size
  const sheetExceedsPaper=sheetL>pW||sheetH>pH; // sheet must be smaller than the raw paper it's cut from
  const jobExceedsPaper=jW>pW||jH>pH; // job must also be smaller than the raw paper
  const sbsFit=(sheetL<=pl.printL/2)||(sheetH<=pl.printW/2);
  const sbsOK=!exceedsPrintArea&&sbsFit;
  const sbsOn=sbs&&sbsOK;
  const mPW=sheetL-2*eM;const botG=(bbTB&&both)||sbsOn?pGrip:eM;const mPH=sheetH-pGrip-botG;
  const sW=mPW-20,sH=mPH-20;
  const lW=cols*jW+(cols>1?(cols-1)*eGH:0);const lH=rows*jH+(rows>1?(rows-1)*eGV:0);
  const bbA=bbLR||bbTB;
  const ups=cols*rows;
  // Front&Back overrides the plain color count with independent front/back color counts (no ×2 doubling —
  // each side already carries its own color set, so total plates = front colors + back colors).
  const effNc=isFB?nC(fbColF)+nC(fbColB):nc;
  const aSh=Math.ceil(qty/ups); // actual physical sheets needed — Back&Back does NOT change how much paper you buy
  const chSh=cr(aSh*(bbA?2:1)); // Impressions charge doubles for Back&Back (each sheet passes through twice), rounded up to 1000
  const imp=chSh*effNc;
  const sheetsNeed=aSh; // actual physical sheets needed to buy — NOT the charged/rounded billing figure (chSh is only for Impression cost minimums)
  const sheetsPerPaper=sheetsFromPaper(pW,pH,sheetL,sheetH).ups; // how many cut sheets come from one raw paper
  const nPap=Math.ceil(sheetsNeed/sheetsPerPaper); // raw papers to buy
  const ePl=sbsOn?Math.ceil(effNc/2):effNc;
  const platC=ePl*pl.impRate;const papC=nPap*pRate;
  const printImpCost=(imp/1000)*pl.impRate; // Printing(Impression) cost — separate from Plate cost
  const lamJW=lW+2*cmSz+1,lamJH=lH+2*cmSz+1;
  const lamSq=m2i(lamJW)*m2i(lamJH);
  const lamC=(lamK==="No Laminate"?0:lamSq*lRate*sheetsNeed)*(lamBoth?2:1);
  const printCost=platC+papC+(enabledCosts[`${activeTab}:laminate`]?lamC:0)+printImpCost;
  const extraCost=artwork+planning+(enabledCosts[`${activeTab}:positive`]?positive:0)+cutting+foilBlock+foiling+dieCutter+dieCutImp+spotUV+pasting+folding+gathering+binding+(enabledCosts[`${activeTab}:rimming`]?rimming:0)+addMat+transport+stripping+numbering+perforating+creasing;
  const bookletCost=sheets.reduce((a,s)=>a+s.cost,0);

  // Multiple Sheets tab totals
  const msEffQty=msMultiCopies?msQty*Math.max(msCopies,1)*(Math.max(msDup,0)+1):msQty;
  const msCalcs=msSigs.map(s=>{
    const livePaper=s.paperCustomMode?null:settings.papers.find(p=>p.name===s.paperName);
    const livePlate=settings.plates.find(p=>p.name===(s.plateName||settings.plates[0]?.name));
    const liveRates={
      paperRate:livePaper&&livePaper.packSheets?livePaper.packPrice/livePaper.packSheets:s.paperRate,
      plateRate:livePlate?livePlate.impRate:s.plateRate,
    };
    return{...s,...liveRates,...sigCalc({...s,...liveRates},msEffQty)};
  });
  const msTotalPaperCost=msCalcs.reduce((a,s)=>a+s.paperCost,0);
  const msTotalPlateCost=msCalcs.reduce((a,s)=>a+s.plateCost,0);
  const msTotalPlates=msCalcs.reduce((a,s)=>a+s.totalPlates,0);
  const msPrintingCost=msCalcs.reduce((a,s)=>a+s.impressionCost,0);
  const msSigCostsTotal=msCalcs.reduce((a,s)=>a+Object.values(s.sigCosts||{}).reduce((b,c)=>b+(c.val||0),0),0);
  const msPrintCost=msTotalPaperCost+msTotalPlateCost+msPrintingCost+msSigCostsTotal;

  const activePrintCost=activeTab==="single"?printCost:msPrintCost;
  const activeBookletCost=activeTab==="single"?bookletCost:0;
  const subtotal=activePrintCost+extraCost+activeBookletCost;
  const profitAmt=subtotal*(profit/100);
  const taxAmt=(subtotal+profitAmt)*(tax/100);
  const total=subtotal+profitAmt+taxAmt;

  // Paper cut options
  const cutOpts=(()=>{
    const o=[];
    for(let dc=1;dc<=8;dc++)for(let dr=1;dr<=8;dr++){
      const cw=sheetL/dc,ch=sheetH/dr;
      const uc=Math.floor((cw-2*eM)/(jW+eGH)),ur=Math.floor((ch-pGrip-eM)/(jH+eGV));
      if(uc>0&&ur>0){const u=uc*ur;o.push({u,uc,ur,sh:cr(Math.ceil(qty/u))});}
    }
    o.sort((a,b)=>a.sh-b.sh||(b.u-a.u));
    const seen=new Set();
    return o.filter(x=>{const k=`${x.uc}x${x.ur}`;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,3);
  })();
  const bestOpt=cutOpts[0];
  useEffect(()=>{
    if(!colsTouched&&bestOpt&&(bestOpt.uc!==cols||bestOpt.ur!==rows)){setCols(bestOpt.uc);setRows(bestOpt.ur);}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[bestOpt&&bestOpt.uc,bestOpt&&bestOpt.ur,colsTouched]);

  // Canvas sizing
  const CX=288,CY=210,sc=Math.min(CX/sheetL,CY/sheetH);
  const dW=Math.round(sheetL*sc),dH=Math.round(sheetH*sc);
  const gPx=Math.round(pGrip*sc),bGpx=(bbTB&&both)||sbsOn?gPx:Math.round(eM*sc);
  const ePx=Math.round(eM*sc);
  const jWp=Math.round(jW*sc),jHp=Math.round(jH*sc);
  const gHp=Math.round(eGH*sc),gVp=Math.round(eGV*sc);
  const sfO=Math.round(10*sc);
  const lWp=cols*jWp+(cols>1?(cols-1)*gHp:0);
  const lHp=rows*jHp+(rows>1?(rows-1)*gVp:0);
  const sXp=ePx+Math.max(0,Math.round(((dW-2*ePx)-lWp)/2));
  const sYp=gPx+Math.max(0,Math.round(((dH-gPx-bGpx)-lHp)/2));

  const allU=[];
  for(let r=0;r<Math.min(rows,20);r++)for(let c=0;c<Math.min(cols,20);c++){
    const id=`${r}-${c}`;
    const pos=mPos[id]||{x:sXp+c*(jWp+gHp),y:sYp+r*(jHp+gVp)};
    allU.push({id,x:pos.x,y:pos.y,i:r*cols+c});
  }
  const rotateJob=()=>{const t=jW;setJW(jH);setJH(t);};
  const rotateSheet=()=>{if(isC){const t=cL;setCL2(cW2);setCW2(t);}else setShOv({l:sheetH,h:sheetL});};
  const showWarn=msg=>{setWarn(msg);setTimeout(()=>setWarn(""),3000);};
  const chgSideMode=m=>{
    setSideMode(m);
  };

  const addBookletSheet=()=>{
    const fit=fitCalc(sheetL,sheetH,pGrip,eM,eGH,newSheet.pageW,newSheet.pageH);
    const ups=Math.max(fit.ups,1);
    const sh=Math.ceil(newSheet.pages/ups);
    const cost=sh*newSheet.rate*nC(newSheet.colors);
    setSheets([...sheets,{...newSheet,id:Date.now(),cost:Math.round(cost),
      cols:fit.cols,rows:fit.rows,ups,rot:fit.rot,sh}]);
    setSheetModal(false);
  };

  // Compact static imposition preview for a booklet sheet — mirrors main canvas layout rules
  // (gripper on top of longest side, ups centered) but non-interactive, sized for a list row.
  const MiniCanvas=({pw,ph,jw,jh,cols,rows,col})=>{
    const CX=104,CY=76,sc=Math.min(CX/pw,CY/ph);
    const dw=Math.max(Math.round(pw*sc),20),dh=Math.max(Math.round(ph*sc),20);
    const gpx=Math.round(pGrip*sc),epx=Math.round(eM*sc);
    const jwp=Math.max(Math.round(jw*sc),2),jhp=Math.max(Math.round(jh*sc),2);
    const gapx=Math.round(eGH*sc);
    const lwp=cols*jwp+(cols>1?(cols-1)*gapx:0),lhp=rows*jhp+(rows>1?(rows-1)*gapx:0);
    const sx=epx+Math.max(0,Math.round(((dw-2*epx)-lwp)/2));
    const sy=gpx+Math.max(0,Math.round(((dh-gpx-epx)-lhp)/2));
    const cells=[];
    for(let r=0;r<Math.min(rows,10);r++)for(let c=0;c<Math.min(cols,10);c++)
      cells.push({x:sx+c*(jwp+gapx),y:sy+r*(jhp+gapx)});
    return(
      <div style={{width:`${dw}px`,height:`${dh}px`,background:"#fff",border:`1.5px solid ${K}`,
        position:"relative",flexShrink:0,overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:`${gpx}px`,
          background:"rgba(245,200,0,0.3)",borderBottom:`1px dashed ${Y}`}}/>
        {cells.map((p,i)=>(
          <div key={i} style={{position:"absolute",left:`${p.x}px`,top:`${p.y}px`,
            width:`${jwp}px`,height:`${jhp}px`,background:col+"33",border:`0.5px solid ${col}`}}/>
        ))}
      </div>
    );
  };

  // Static imposition preview for a Multiple Sheets signature — fully self-contained
  // (unlike MiniCanvas above, doesn't read tab-1 state) since paper/grip/gap are per-signature.
  const SigCanvas=({pw,ph,jw,jh,cols,rows,col})=>{
    const CX=104,CY=76,sc=Math.min(CX/Math.max(pw,1),CY/Math.max(ph,1));
    const dw=Math.max(Math.round(pw*sc),20),dh=Math.max(Math.round(ph*sc),20);
    const gpx=Math.round(10*sc),epx=Math.round(5*sc);
    const jwp=Math.max(Math.round(jw*sc),2),jhp=Math.max(Math.round(jh*sc),2);
    const gapx=Math.round(3*sc);
    const lwp=cols*jwp+(cols>1?(cols-1)*gapx:0),lhp=rows*jhp+(rows>1?(rows-1)*gapx:0);
    const sx=epx+Math.max(0,Math.round(((dw-2*epx)-lwp)/2));
    const sy=gpx+Math.max(0,Math.round(((dh-gpx-epx)-lhp)/2));
    const cells=[];
    for(let r=0;r<Math.min(rows,10);r++)for(let c=0;c<Math.min(cols,10);c++)
      cells.push({x:sx+c*(jwp+gapx),y:sy+r*(jhp+gapx)});
    return(
      <div style={{width:`${dw}px`,height:`${dh}px`,background:"#fff",border:`1.5px solid ${K}`,
        position:"relative",flexShrink:0,overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:`${gpx}px`,
          background:"rgba(245,200,0,0.3)",borderBottom:`1px dashed ${Y}`}}/>
        {cells.map((p,i)=>(
          <div key={i} style={{position:"absolute",left:`${p.x}px`,top:`${p.y}px`,
            width:`${jwp}px`,height:`${jhp}px`,background:col+"33",border:`0.5px solid ${col}`}}/>
        ))}
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:"#a0a0a8",display:"flex",alignItems:"center",
      justifyContent:"center",padding:"min(10px, 2vw)",fontFamily:"'Segoe UI',system-ui,sans-serif",
      boxSizing:"border-box"}}>
      <div style={{width:"100%",maxWidth:"370px",height:"100vh",maxHeight:"760px",background:BG,
        borderRadius:"min(36px, 4vw)",overflow:"hidden",
        boxShadow:`0 0 0 min(6px,1vw) ${K},0 0 0 min(9px,1.5vw) #2a3d5a,0 24px 48px rgba(0,0,0,0.4)`,
        display:"flex",flexDirection:"column",position:"relative",boxSizing:"border-box"}}>

        <div style={{background:K,height:"24px",display:"flex",alignItems:"center",
          justifyContent:"space-between",padding:"0 16px",flexShrink:0}}>
          <span style={{color:"#fff",fontSize:"11px",fontWeight:"600"}}>9:41</span>
          <span style={{color:"#fff",fontSize:"11px"}}>▐ 100%</span>
        </div>
        <div style={{background:K,flexShrink:0}}>
          <Bar/>
          {screen==="plan"?<>
          <div style={{padding:"6px 10px",display:"flex",alignItems:"center",gap:"6px"}}>
            <button style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"6px",
              padding:"4px 8px",color:"#fff",fontSize:"12px",cursor:"pointer"}}>←</button>
            <div style={{flex:1,textAlign:"center",color:"#fff",fontWeight:"700",fontSize:"13px"}}>📐 Plan Sheet</div>
            <div style={{display:"flex",background:"rgba(255,255,255,0.1)",borderRadius:"6px",padding:"2px"}}>
              {["mm","inch"].map(u=>(
                <button key={u} onClick={()=>setUnit(u)}
                  style={{background:unit===u?C:"transparent",border:"none",borderRadius:"4px",
                  padding:"3px 6px",color:"#fff",fontSize:"10px",fontWeight:"700",cursor:"pointer"}}>{u}</button>
              ))}
            </div>
            <button onClick={()=>setScreen("settings")} title="Settings"
              style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"6px",
              padding:"4px 8px",color:"#fff",fontSize:"13px",cursor:"pointer"}}>⚙</button>
          </div>
          <div style={{display:"flex",padding:"0 10px 8px",gap:"2px"}}>
            {[["single","📄 Single Sheet"],["multi","📚 Multiple Sheets"]].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                style={{flex:1,padding:"6px 4px",border:"none",borderRadius:"6px",
                background:activeTab===k?C:"rgba(255,255,255,0.12)",
                color:"#fff",fontWeight:"700",fontSize:"11px",cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          </>:
          <div style={{padding:"6px 10px 10px",display:"flex",alignItems:"center",gap:"8px"}}>
            <button onClick={()=>setScreen("plan")} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"6px",
              padding:"4px 8px",color:"#fff",fontSize:"12px",cursor:"pointer"}}>←</button>
            <div style={{flex:1,textAlign:"center",color:"#fff",fontWeight:"700",fontSize:"13px"}}>⚙ Settings</div>
            <div style={{display:"flex",background:"rgba(255,255,255,0.1)",borderRadius:"6px",padding:"2px"}}>
              {["mm","inch"].map(u=>(
                <button key={u} onClick={()=>setUnit(u)}
                  style={{background:unit===u?C:"transparent",border:"none",borderRadius:"4px",
                  padding:"3px 6px",color:"#fff",fontSize:"10px",fontWeight:"700",cursor:"pointer"}}>{u}</button>
              ))}
            </div>
          </div>}
        </div>

        {screen==="plan"&&<div style={{flex:1,overflowY:"auto",overflowX:"hidden",background:BG}}>

          {activeTab==="single"&&<>
          {/* ══ 1. ALL ADJUSTABLE ══ */}
          <div style={{background:CARD,margin:"6px 8px 0",borderRadius:"12px",padding:"9px",
            boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>

            {/* Product name */}
            <div style={{marginBottom:"5px"}}>
              <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>PRODUCT (NAME)</div>
              <input value={productName} onChange={e=>setProductName(e.target.value)} list="product-presets"
                style={{width:"100%",padding:"5px 6px",border:`1.5px solid ${BD}`,borderRadius:"7px",
                fontSize:"12px",outline:"none",fontWeight:"700",boxSizing:"border-box"}}/>
              <datalist id="product-presets">{PRODUCT_PRESETS.map(p=><option key={p} value={p}/>)}</datalist>
              <label style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"5px",cursor:"pointer",
                padding:"5px 8px",border:`1.5px dashed ${C}`,borderRadius:"7px",background:CL}}>
                <span style={{fontSize:"11px",color:C,fontWeight:"700"}}>📄 Upload artwork PDF (auto-fills Job L/W)</span>
                <input type="file" accept="application/pdf" style={{display:"none"}} onChange={async e=>{
                    const file=e.target.files[0];if(!file)return;
                    const info=await parsePdfInfo(file);
                    if(info){
                      if(info.pageCount>1){showWarn(`⚠ This PDF has ${info.pageCount} pages — looks like a book. Use "Upload book PDF" on the Multiple Sheets tab instead.`);}
                      setJW(info.pageWMM);setJH(info.pageHMM);
                    }
                    e.target.value="";
                  }}/>
              </label>
            </div>

            {/* Job L×W + Colors + Qty — right next to Product Name */}
            <div style={{display:"flex",gap:"4px",alignItems:"flex-end",marginBottom:"5px"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:M,fontWeight:"700",marginBottom:"2px"}}>Job L</div>
                <NumField unit={unit} mm={jW} onMM={v=>{setJW(v);}}
                  style={{width:"100%",padding:"5px 3px",border:`2px solid ${M}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",color:M,fontWeight:"800",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <button onClick={()=>{const t=jW;setJW(jH);setJH(t);}} title="Swap Length ↔ Width"
                style={{background:BG,border:`1px solid ${BD}`,borderRadius:"6px",padding:"5px 4px",
                cursor:"pointer",color:MT,fontWeight:"800",fontSize:"11px",flexShrink:0,marginBottom:"1px"}}>⇄</button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:M,fontWeight:"700",marginBottom:"2px"}}>Job W</div>
                <NumField unit={unit} mm={jH} onMM={v=>{setJH(v);}}
                  style={{width:"100%",padding:"5px 3px",border:`2px solid ${M}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",color:M,fontWeight:"800",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>No of Colors</div>
                <select value={colS} onChange={e=>setColS(e.target.value)} disabled={isFB}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                  fontSize:"11px",outline:"none",background:isFB?"#f8f8f8":CARD,color:isFB?MT:T,boxSizing:"border-box"}}>
                  {COLS_OPTS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Qty</div>
                <FreeNum val={qty} onVal={v=>setQty(Math.max(v,1))}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* Paper dropdown + Frequent Sheet Sizes (Sheet L/W only shown when Custom is picked) */}
            <div style={{display:"flex",gap:"4px",alignItems:"flex-end",marginBottom:"5px"}}>
              <div style={{flex:"1.2",minWidth:0}}>
                <div style={{fontSize:"8px",color:C,fontWeight:"700",marginBottom:"2px"}}>PAPER</div>
                <select value={pp.n} onChange={e=>{
                    if(e.target.value==="+ Add New Paper"){setScreen("settings");return;}
                    setPi(paperList.findIndex(p=>p.n===e.target.value));setShOv(null);setCustomMode(false);
                  }}
                  style={{width:"100%",padding:"5px 4px",border:`1.5px solid ${C}`,borderRadius:"7px",
                  fontSize:"11px",outline:"none",color:C,background:CARD,fontWeight:"700",boxSizing:"border-box"}}>
                  {paperList.map(p=><option key={p.n}>{p.n}</option>)}
                </select>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Sheet Size</div>
                <select value={sheetSizeSel} onChange={e=>{
                    if(e.target.value==="Custom"){setCustomMode(true);return;}
                    setCustomMode(false);
                    const preset=sheetSizeOpts[Number(e.target.value)];
                    if(!preset)return;
                    if(isC){setCL2(preset.l);setCW2(preset.w);}else setShOv({l:preset.l,h:preset.w});
                  }}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                  fontSize:"10px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                  {sheetSizeOpts.map((sp,i)=><option key={i} value={i}>{fs(sp.l)}×{fs(sp.w)}</option>)}
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>
            {sheetSizeSel==="Custom"&&<div style={{display:"flex",gap:"4px",alignItems:"flex-end",marginBottom:"5px"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Sheet L</div>
                <NumField unit={unit} mm={isC?cL:sheetL}
                  onMM={v=>{if(isC)setCL2(v);else setShOv({l:v,h:shOv?shOv.h:pH});}}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${C}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",color:C,fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <button onClick={rotateSheet}
                title="Change Length to Width, Width to Length"
                style={{background:BG,border:`1px solid ${BD}`,borderRadius:"6px",padding:"5px 5px",
                cursor:"pointer",color:MT,fontWeight:"800",fontSize:"12px",flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center",height:"28px",marginBottom:"1px"}}>⇄</button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Sheet W</div>
                <NumField unit={unit} mm={isC?cW2:sheetH}
                  onMM={v=>{if(isC)setCW2(v);else setShOv({l:shOv?shOv.l:pW,h:v});}}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${C}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",color:C,fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>}
            {(sheetExceedsPaper||jobExceedsPaper)&&<div style={{background:"#FEE2E2",borderRadius:"6px",
              padding:"4px 8px",marginBottom:"5px",fontSize:"9px",color:ERR,fontWeight:"700"}}>
              ⚠ {sheetExceedsPaper?"Sheet size":"Job size"} must be smaller than the paper size ({fs(pW)}×{fs(pH)}).</div>}

            {/* Plate + Side (5-item dropdown) */}
            <div style={{display:"flex",gap:"4px",marginBottom:"5px",alignItems:"flex-end"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>PLATE</div>
                <select value={platK} onChange={e=>setPlatK(e.target.value)}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                  fontSize:"11px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                  {settings.plates.map(p=><option key={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div style={{flex:"1.6",minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>SIDE</div>
                <select value={sideMode} onChange={e=>chgSideMode(e.target.value)}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                  fontSize:"10px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                  {SIDE_OPTS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {exceedsPrintArea&&<div style={{background:"#FEE2E2",borderRadius:"6px",padding:"4px 8px",marginBottom:"5px",
              fontSize:"9px",color:ERR,fontWeight:"700"}}>please select suitable plate</div>}
            {warn&&<div style={{background:"#FEF3C7",borderRadius:"6px",padding:"4px 8px",marginBottom:"5px",
              fontSize:"9px",color:"#92400E",fontWeight:"700"}}>{warn}</div>}

            {/* Front&Back color override */}
            {isFB&&<div style={{display:"flex",gap:"4px",marginBottom:"5px"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:C,fontWeight:"700",marginBottom:"2px"}}>Front — No of Colors</div>
                <select value={fbColF} onChange={e=>setFbColF(e.target.value)}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${C}`,borderRadius:"6px",
                  fontSize:"10px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                  {COLS_OPTS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:M,fontWeight:"700",marginBottom:"2px"}}>Back — No of Colors</div>
                <select value={fbColB} onChange={e=>setFbColB(e.target.value)}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${M}`,borderRadius:"6px",
                  fontSize:"10px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                  {COLS_OPTS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{background:BG,borderRadius:"6px",padding:"4px 6px",fontSize:"9px",
                color:MT,fontWeight:"700",alignSelf:"flex-end",whiteSpace:"nowrap"}}>
                Total {effNc}C for plates</div>
            </div>}

            {/* ups/sheets — moved below Plate row */}
            <div style={{display:"flex",gap:"4px"}}>
              {cutOpts.map((opt,i)=>(
                <div key={i} onClick={()=>{setCols(opt.uc);setRows(opt.ur);setColsTouched(true);}}
                  style={{flex:1,background:cols===opt.uc&&rows===opt.ur?CL:i===0?"#F0FFF4":BG,
                  border:`1.5px solid ${cols===opt.uc&&rows===opt.ur?C:i===0?SUC:BD}`,
                  borderRadius:"8px",padding:"5px 4px",cursor:"pointer",textAlign:"center",position:"relative"}}>
                  {i===0&&<div style={{position:"absolute",top:-7,left:"50%",transform:"translateX(-50%)",
                    background:SUC,borderRadius:"3px",padding:"1px 4px"}}>
                    <span style={{color:"#fff",fontSize:"8px",fontWeight:"700"}}>BEST</span></div>}
                  <div style={{fontSize:"13px",fontWeight:"800",color:cols===opt.uc&&rows===opt.ur?C:K,lineHeight:1}}>{opt.u}</div>
                  <div style={{fontSize:"8px",color:MT}}>ups/sheet</div>
                  <div style={{fontSize:"9px",fontWeight:"700",color:i===0?SUC:WARN}}>{fmt(opt.sh)}sh</div>
                  <div style={{fontSize:"8px",color:MT}}>{opt.uc}×{opt.ur}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ══ 2. PLANNING SHEET ══ */}
          <div style={{background:CARD,margin:"6px 8px 0",borderRadius:"12px",padding:"9px",
            boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <button onClick={()=>setShowPlan(!showPlan)} style={{width:"100%",background:BG,
              border:`1px solid ${BD}`,borderRadius:"8px",padding:"7px",cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:"5px"}}>
              <span style={{fontSize:"11px",fontWeight:"700",color:T}}>Planning Sheet</span>
              <span style={{fontSize:"10px",color:MT}}>{showPlan?"▾":"▸"}</span>
            </button>
            {showPlan&&<div style={{display:"flex",justifyContent:"center",gap:"8px",marginTop:"7px"}}>
                {[["C",cols,c=>setCols(Math.max(1,c-1)),c=>setCols(c+1),C],
                  ["R",rows,r=>setRows(Math.max(1,r-1)),r=>setRows(r+1),M]
                ].map(([lbl,val,dec,inc,col])=>(
                  <div key={lbl} style={{display:"flex",gap:"1px",alignItems:"center"}}>
                    <button onClick={()=>{dec(val);setColsTouched(true);}}
                      style={{width:"18px",height:"20px",flexShrink:0,background:BG,border:`1px solid ${col}`,
                      borderRadius:"3px 0 0 3px",cursor:"pointer",fontWeight:"800",color:col,fontSize:"12px",
                      display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>−</button>
                    <span style={{width:"20px",textAlign:"center",fontSize:"12px",fontWeight:"800",color:col}}>{val}</span>
                    <button onClick={()=>{inc(val);setColsTouched(true);}}
                      style={{width:"18px",height:"20px",flexShrink:0,background:col+"20",border:`1px solid ${col}`,
                      borderRadius:"0 3px 3px 0",cursor:"pointer",fontWeight:"800",color:col,fontSize:"12px",
                      display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>+</button>
                  </div>
                ))}
              </div>}

            {showPlan&&<>
            {/* Gap H, Gap V, Cut Mark — right under Columns/Rows adjustment */}
            <div style={{display:"flex",gap:"4px",marginTop:"6px"}}>
              {[["Column Space",gH,v=>setGH(v),MT],["Row Space",gV,v=>setGV(v),MT],["Cut Mark",cmSz,setCmSz,K]].map(([l,v,s,col])=>(
                <div key={l} style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px",textAlign:"center"}}>{l}</div>
                  <NumField unit={unit} mm={v} onMM={s}
                    style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${col}`,borderRadius:"5px",
                    fontSize:"11px",textAlign:"center",color:col,fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
                </div>
              ))}
              <button onClick={()=>setCm(!cm)} title="Toggle cut marks on canvas"
                style={{flexShrink:0,background:cm?K:BG,border:`1.5px solid ${cm?K:BD}`,borderRadius:"5px",
                padding:"4px 7px",cursor:"pointer",color:cm?"#fff":MT,fontWeight:"800",fontSize:"12px",
                height:"25px",alignSelf:"flex-end"}}>✂</button>
              <button onClick={rotateJob}
                style={{background:CL,border:`1.5px solid ${C}`,borderRadius:"6px",padding:"4px 8px",
                cursor:"pointer",color:C,fontWeight:"800",fontSize:"14px",height:"25px",alignSelf:"flex-end",
                display:"flex",alignItems:"center"}}>↺</button>
            </div>
            <div style={{fontSize:"8px",color:MT,marginTop:"3px"}}>Plate Grip:
              <NumField unit={unit} mm={pGrip} onMM={setPGrip}
                style={{width:"50px",padding:"2px 4px",border:`1px solid ${WARN}`,borderRadius:"4px",
                fontSize:"10px",textAlign:"center",color:WARN,fontWeight:"700",outline:"none",marginLeft:"4px"}}/>
            </div>

            {lW>mPW||lH>mPH?<div style={{background:"#FEE2E2",borderRadius:"6px",padding:"4px 8px",
              marginTop:"6px",fontSize:"10px",fontWeight:"700",color:ERR}}>
              ⚠️ Exceeds print area {fs(lW)}×{fs(lH)}&gt;{fs(mPW)}×{fs(mPH)}</div>:null}

            {/* Canvas */}
            <div style={{display:"flex",gap:"3px",alignItems:"center",marginTop:"6px"}}>
              <div style={{width:"13px",flexShrink:0,height:`${dH}px`,display:"flex",
                flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:"1px",flex:1,background:C,maxHeight:"30px"}}/>
                <span style={{fontSize:"8px",color:C,fontWeight:"700",writingMode:"vertical-rl",
                  transform:"rotate(180deg)",whiteSpace:"nowrap"}}>{fs(sheetH)}</span>
                <div style={{width:"1px",flex:1,background:C,maxHeight:"30px"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"2px",marginBottom:"2px"}}>
                  <div style={{height:"1px",flex:1,background:C}}/>
                  <span style={{fontSize:"8px",color:C,fontWeight:"700",whiteSpace:"nowrap"}}>{fs(sheetL)}</span>
                  <div style={{height:"1px",flex:1,background:C}}/>
                </div>
                <div style={{width:`${dW}px`,height:`${dH}px`,background:"#fff",border:`2px solid ${K}`,
                  position:"relative",overflow:"hidden",userSelect:"none",
                  margin:"0 auto",display:"block"}}>
                  {/* Safe Area — small checkbox, top-right corner + rotate (swaps Sheet L/W) */}
                  <div style={{position:"absolute",top:"3px",right:"3px",zIndex:5,display:"flex",gap:"3px"}}>
                    <button onClick={rotateSheet} title="Rotate sheet (swaps Length/Width)"
                      style={{width:"14px",height:"11px",padding:0,border:`1px solid ${BD}`,borderRadius:"2px",
                      background:"#fff",color:MT,fontSize:"8px",cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>↻</button>
                    <div onClick={()=>setSafe(!safe)} title="Safe Area" style={{
                      width:"11px",height:"11px",border:`1.5px solid ${safe?T:BD}`,borderRadius:"2px",
                      background:safe?T:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {safe&&<span style={{color:"#fff",fontSize:"8px",lineHeight:1}}>✓</span>}
                    </div>
                  </div>
                  {/* Gripper — always top (and bottom too, for Back&Back-T-B or side-by-side plate) */}
                  <div style={{position:"absolute",top:0,left:0,right:0,height:`${gPx}px`,
                    background:"rgba(150,150,150,0.18)",borderBottom:`1px dashed ${MT}`,
                    zIndex:2,pointerEvents:"none"}}>
                    <span style={{fontSize:"7px",color:MT,fontWeight:"700",padding:"1px 2px",display:"block"}}>
                      GRIP {fs(pGrip)}</span>
                  </div>
                  {((bbTB&&both)||sbsOn)&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:`${gPx}px`,
                    background:"rgba(150,150,150,0.18)",borderTop:`1px dashed ${MT}`,zIndex:2,pointerEvents:"none"}}/>}
                  {safe&&(()=>{
                    const safeW=dW-2*ePx-2*sfO,safeH=dH-gPx-bGpx-2*sfO;
                    const exceedsSafe=lWp>safeW||lHp>safeH; // ups fit the sheet but spill past the safe margin
                    return<div style={{position:"absolute",zIndex:1,pointerEvents:"none",
                      top:`${gPx+sfO}px`,left:`${ePx+sfO}px`,
                      width:`${safeW}px`,height:`${safeH}px`,
                      border:`0.75px dashed ${exceedsSafe?ERR:SUC}`}}/>;
                  })()}
                  <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",
                    pointerEvents:"none",zIndex:2}}>
                    {Array.from({length:Math.ceil(dW/12)+1},(_,i)=>(
                      <line key={`v${i}`} x1={i*12} y1={0} x2={i*12} y2={dH} stroke="#F0F0F0" strokeWidth="0.4"/>))}
                    {Array.from({length:Math.ceil(dH/12)+1},(_,i)=>(
                      <line key={`h${i}`} x1={0} y1={i*12} x2={dW} y2={i*12} stroke="#F0F0F0" strokeWidth="0.4"/>))}
                    {/* Outer cut marks */}
                    {cm&&allU.length>0&&(()=>{
                      const x0=sXp,y0=sYp,x1=sXp+lWp,y1=sYp+lHp;
                      const l=Math.max(Math.round(cmSz*sc),4);
                      return<g stroke="#333" strokeWidth="0.8">
                        <line x1={x0-l-1} y1={y0} x2={x0-1} y2={y0}/><line x1={x0} y1={y0-l-1} x2={x0} y2={y0-1}/>
                        <line x1={x1+1} y1={y0} x2={x1+1+l} y2={y0}/><line x1={x1} y1={y0-l-1} x2={x1} y2={y0-1}/>
                        <line x1={x0-l-1} y1={y1} x2={x0-1} y2={y1}/><line x1={x0} y1={y1+1} x2={x0} y2={y1+1+l}/>
                        <line x1={x1+1} y1={y1} x2={x1+1+l} y2={y1}/><line x1={x1} y1={y1+1} x2={x1} y2={y1+1+l}/>
                      </g>;
                    })()}
                    {allU[0]&&(()=>{const{x,y}=allU[0];return<>
                      <line x1={x} y1={y-1} x2={x+jWp} y2={y-1} stroke={C} strokeWidth="0.5"/>
                      <text x={x+jWp/2} y={y-2} fontSize="5" fill={C} textAnchor="middle" fontWeight="700">{fs(jW)}</text>
                      <line x1={x-1} y1={y} x2={x-1} y2={y+jHp} stroke={M} strokeWidth="0.5"/>
                      <text x={x-2} y={y+jHp/2} fontSize="5" fill={M} textAnchor="middle" fontWeight="700"
                        transform={`rotate(-90,${x-2},${y+jHp/2})`}>{fs(jH)}</text>
                    </>;})}
                    {gH>0&&gHp>4&&allU.length>1&&allU[0]&&(()=>{
                      const{x,y}=allU[0];const mx=x+jWp+gHp/2;
                      return<>
                        <line x1={x+jWp} y1={y+jHp/2} x2={x+jWp+gHp} y2={y+jHp/2} stroke={M} strokeWidth="0.5"/>
                        <text x={mx} y={y+jHp/2-1} fontSize="4" fill={M} textAnchor="middle">{fs(gH)}</text>
                      </>;
                    })()}
                    {bbLR&&bLROK&&(()=>{const mx=sXp+Math.floor(cols/2)*(jWp+gHp);
                      return<line x1={mx} y1={gPx} x2={mx} y2={dH-bGpx} stroke={M} strokeWidth="1.5" strokeDasharray="3,2"/>;})()}
                    {bbTB&&bTBOK&&(()=>{const my=sYp+Math.floor(rows/2)*(jHp+gVp);
                      return<line x1={ePx} y1={my} x2={dW-ePx} y2={my} stroke={M} strokeWidth="1.5" strokeDasharray="3,2"/>;})()}
                    {/* Uploaded cutter line — shown as an outline only, centered on the first up */}
                    {cutterFile&&allU[0]&&(()=>{const{x,y}=allU[0];
                      return<rect x={x+2} y={y+2} width={Math.max(jWp-4,4)} height={Math.max(jHp-4,4)}
                        fill="none" stroke="#7C3AED" strokeWidth="1" strokeDasharray="2,2" rx="3"/>;})()}
                  </svg>
                  {allU.map((u,idx)=>{
                    const bg=[CL,ML,"#FFFBE0","#F0FFF4"][idx%4],bd=[C,M,"#D4A000",SUC][idx%4];
                    if(u.x+jWp>dW+2||u.y+jHp>dH+2)return null;
                    return<div key={u.id}
                      style={{position:"absolute",left:`${u.x}px`,top:`${u.y}px`,
                      width:`${jWp}px`,height:`${jHp}px`,
                      background:bg,border:`0.5px solid ${bd}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:"8px",color:bd,fontWeight:"700",boxSizing:"border-box",
                      userSelect:"none",zIndex:3}}>{idx+1}</div>;
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:"2px"}}>
                  <span style={{fontSize:"8px",color:MT}}>space {gH>0?fs(gH):"none"}</span>
                  {cutterFile&&<span style={{fontSize:"8px",color:"#7C3AED",fontWeight:"700"}}>📎 {cutterFile}</span>}
                </div>
              </div>
            </div>

            {bbA&&<div style={{background:ML,borderRadius:"7px",padding:"5px 9px",marginTop:"5px",
              fontSize:"10px",color:M,fontWeight:"600"}}>
              B+B: {fmt(aSh)} actual sh → {fmt(chSh)} charged → {fmt(imp)} imp</div>}

            {/* Upload cutter line — outline only, no drag/long-press */}
            <div style={{marginTop:"6px",paddingTop:"6px",borderTop:"1px solid #F3F4F6"}}>
              <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"5px",
                background:BG,border:`1.5px dashed ${BD}`,borderRadius:"8px",padding:"8px",
                cursor:"pointer",fontSize:"11px",color:MT,fontWeight:"700"}}>
                📎 {cutterFile?cutterFile:"Upload Cutter Line (PDF)"}
                <input type="file" accept="application/pdf" style={{display:"none"}}
                  onChange={e=>setCutterFile(e.target.files[0]?e.target.files[0].name:null)}/>
              </label>
              {cutterFile&&<div style={{fontSize:"9px",color:MT,marginTop:"3px",textAlign:"center"}}>
                Shown as an outline on the first up above.
                <button onClick={()=>setCutterFile(null)} style={{background:"none",border:"none",
                  color:ERR,cursor:"pointer",fontWeight:"700",marginLeft:"4px"}}>Remove</button></div>}
            </div>
            </>}
          </div>
          </>}

          {activeTab==="multi"&&<>
          {/* ══ MULTI-SHEET JOB INFO (compact, per Drawing 1) ══ */}
          <div style={{background:CARD,margin:"6px 8px 0",borderRadius:"12px",padding:"9px",
            boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginBottom:"7px"}}>
              <Tog lbl="Multiple sheet" on={msMultiSheet} cb={()=>{setMsMultiSheet(!msMultiSheet);if(!msMultiSheet)setMsMultiCopies(false);}} col="#7C3AED"/>
              <Tog lbl="Multiple copies" on={msMultiCopies} cb={()=>{setMsMultiCopies(!msMultiCopies);if(!msMultiCopies)setMsMultiSheet(false);}} col="#7C3AED"/>
            </div>

            {msUploadedPdfName?(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                marginBottom:"4px",padding:"5px 8px",border:`1.5px solid ${C}`,borderRadius:"7px",background:CL}}>
                <span style={{fontSize:"11px",color:C,fontWeight:"700",overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>📖 {msUploadedPdfName}</span>
                <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
                  <label style={{cursor:"pointer",color:C,fontSize:"11px"}}>
                    ✎
                    <input type="file" accept="application/pdf" style={{display:"none"}} onChange={async e=>{
                        const file=e.target.files[0];if(!file)return;
                        const info=await parsePdfInfo(file);
                        if(info){
                          if(info.pageCount===1){showWarn(`⚠ This PDF has only 1 page — looks like a single job, not a book. Use "Upload artwork PDF" on the Single Sheet tab instead.`);}
                          setMsUploadedPdfName(file.name);
                          setMsTotalPages(info.pageCount);setMsProdW(info.pageWMM);setMsProdH(info.pageHMM);
                          syncPagesIntoGroups(info.pageCount,info.pageWMM,info.pageHMM);
                        }
                        e.target.value="";
                      }}/>
                  </label>
                  <button onClick={()=>setMsUploadedPdfName(null)}
                    style={{background:"none",border:"none",color:ERR,fontSize:"12px",fontWeight:"700",cursor:"pointer",padding:0}}>✕</button>
                </div>
              </div>
            ):(
              <label style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"4px",cursor:"pointer",
                padding:"5px 8px",border:`1.5px dashed ${C}`,borderRadius:"7px",background:CL}}>
                <span style={{fontSize:"11px",color:C,fontWeight:"700"}}>📖 Upload book PDF (auto-fills pages + Job L/W)</span>
                <input type="file" accept="application/pdf" style={{display:"none"}} onChange={async e=>{
                    const file=e.target.files[0];if(!file)return;
                    const info=await parsePdfInfo(file);
                    if(info){
                      if(info.pageCount===1){showWarn(`⚠ This PDF has only 1 page — looks like a single job, not a book. Use "Upload artwork PDF" on the Single Sheet tab instead.`);}
                      setMsUploadedPdfName(file.name);
                      setMsTotalPages(info.pageCount);setMsProdW(info.pageWMM);setMsProdH(info.pageHMM);
                      syncPagesIntoGroups(info.pageCount,info.pageWMM,info.pageHMM);
                    }
                    e.target.value="";
                  }}/>
              </label>
            )}
            {warn&&<div style={{background:"#FEF3C7",borderRadius:"6px",padding:"4px 8px",marginBottom:"5px",
              fontSize:"8px",color:"#92400E",fontWeight:"700"}}>{warn}</div>}

            <div style={{display:"flex",gap:"4px",marginBottom:"5px"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Product</div>
                <input value={msProduct} onChange={e=>setMsProduct(e.target.value)} list="ms-product-presets"
                  style={{width:"100%",padding:"5px 6px",border:`1.5px solid ${BD}`,borderRadius:"7px",
                  fontSize:"12px",outline:"none",fontWeight:"700",boxSizing:"border-box"}}/>
                <datalist id="ms-product-presets">{PRODUCT_PRESETS.map(p=><option key={p} value={p}/>)}</datalist>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:M,fontWeight:"700",marginBottom:"2px"}}>Job L</div>
                <NumField unit={unit} mm={msProdW} onMM={setMsProdW}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${M}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",color:M,fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <button onClick={()=>{const t=msProdW;setMsProdW(msProdH);setMsProdH(t);}} title="Swap Length ↔ Width"
                style={{background:BG,border:`1px solid ${BD}`,borderRadius:"6px",padding:"5px 4px",
                cursor:"pointer",color:MT,fontWeight:"800",fontSize:"11px",flexShrink:0,marginBottom:"1px"}}>⇄</button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:M,fontWeight:"700",marginBottom:"2px"}}>Job W</div>
                <NumField unit={unit} mm={msProdH} onMM={setMsProdH}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${M}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",color:M,fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            <div style={{display:"flex",gap:"4px",marginBottom:msMultiCopies?"5px":0}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:C,fontWeight:"700",marginBottom:"2px"}}>Qty (No of Books)</div>
                <FreeNum val={msQty} onVal={setMsQty}
                  style={{width:"100%",padding:"5px 3px",border:`2px solid ${C}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",color:C,fontWeight:"800",outline:"none",boxSizing:"border-box"}}/>
              </div>
              {!msMultiCopies&&<div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>No of pages</div>
                <FreeNum val={msTotalPages} onVal={v=>{setMsTotalPages(v);syncPagesIntoGroups(v);}}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>No of Paper used</div>
                <FreeNum val={msSigs.length} onVal={v=>{
                    const n=Math.max(1,Math.round(v));
                    if(n>msSigs.length){const add=[];for(let i=msSigs.length;i<n;i++)add.push(blankSig(`Paper ${i+1}`));setMsSigs(s=>[...s,...add]);}
                    else if(n<msSigs.length){setMsSigs(s=>s.slice(0,n));}
                  }}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            {msMultiCopies&&<div style={{display:"flex",gap:"4px"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>No of copies</div>
                <FreeNum val={msCopies} onVal={v=>setMsCopies(Math.max(v,1))}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${ERR}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>No of Duplicates + Original</div>
                <FreeNum val={msDup} onVal={setMsDup}
                  style={{width:"100%",padding:"5px 3px",border:`1.5px solid ${ERR}`,borderRadius:"6px",
                  fontSize:"12px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>}
          </div>

          {/* ══ MULTI-SHEET SIGNATURES (Paper 1, Paper 2, ...) ══ */}
          {msCalcs.map((s,idx)=>{
            const tCol=idx%2===0?C:M;
            return(
            <div key={s.id} style={{background:CARD,margin:"6px 8px 0",borderRadius:"12px",padding:"9px",
              boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                <input value={s.name} onChange={e=>updSig(s.id,{name:e.target.value})}
                  style={{border:"none",background:"transparent",fontSize:"12px",fontWeight:"800",
                  color:tCol,outline:"none",padding:0,flex:1}}/>
                <div style={{display:"flex",gap:"4px"}}>
                  <button onClick={()=>updSig(s.id,{minimized:!s.minimized})}
                    style={{background:BG,border:`1px solid ${BD}`,borderRadius:"4px",padding:"2px 6px",
                    color:MT,fontWeight:"700",cursor:"pointer",fontSize:"10px"}}>{s.minimized?"▸":"▾"}</button>
                  {msSigs.length>1&&<button onClick={()=>rmSig(s.id)}
                    style={{background:"#FEE2E2",border:"none",borderRadius:"4px",padding:"2px 6px",
                    color:ERR,fontWeight:"700",cursor:"pointer",fontSize:"10px"}}>✕</button>}
                </div>
              </div>
              {!s.minimized&&<>

              <div style={{display:"flex",gap:"4px",marginBottom:"5px"}}>
                <div style={{flex:"1.3",minWidth:0}}>
                  <div style={{fontSize:"8px",color:C,fontWeight:"700",marginBottom:"2px"}}>Paper</div>
                  <select value={s.paperName||"+ Add New Paper"}
                    onChange={e=>{
                      if(e.target.value==="+ Add New Paper"){setScreen("settings");return;}
                      const p=paperList.find(x=>x.shortName===e.target.value);
                      if(p)updSig(s.id,{sheetCustomMode:false,paperName:p.shortName,paperW:p.w,paperH:p.h,sheetW:p.w,sheetH:p.h,...autoFitSheet(p.w,p.h)});
                    }}
                    style={{width:"100%",padding:"4px 3px",border:`1.5px solid ${C}`,borderRadius:"5px",
                    fontSize:"10px",outline:"none",background:CARD,color:C,fontWeight:"700",boxSizing:"border-box"}}>
                    {paperList.map(p=><option key={p.n} value={p.shortName}>{p.n}</option>)}
                  </select>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Sheet Size</div>
                  {(()=>{
                    const curPaper=paperList.find(x=>x.shortName===s.paperName);
                    const sigSheetOpts=(curPaper&&curPaper.sheetSizes&&curPaper.sheetSizes.length)?curPaper.sheetSizes:deriveSheetSizes(s.paperW,s.paperH).slice(0,6);
                    const sigPresetIdx=sigSheetOpts.findIndex(sp=>Math.round(sp.l)===Math.round(s.sheetW)&&Math.round(sp.w)===Math.round(s.sheetH));
                    const sigSel=s.sheetCustomMode?"Custom":(sigPresetIdx>=0?String(sigPresetIdx):"Custom");
                    return(
                      <select value={sigSel} onChange={e=>{
                          if(e.target.value==="Custom"){updSig(s.id,{sheetCustomMode:true});return;}
                          const preset=sigSheetOpts[Number(e.target.value)];
                          if(preset)updSig(s.id,{sheetCustomMode:false,sheetW:preset.l,sheetH:preset.w,...autoFitSheet(preset.l,preset.w)});
                        }}
                        style={{width:"100%",padding:"4px 3px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                        fontSize:"9px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                        {sigSheetOpts.map((sp,i)=><option key={i} value={i}>{fs(sp.l)}×{fs(sp.w)}</option>)}
                        <option value="Custom">Custom</option>
                      </select>
                    );
                  })()}
                </div>
              </div>
              {s.sheetCustomMode&&<div style={{display:"flex",gap:"4px",marginBottom:"5px",alignItems:"flex-end"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Sheet L</div>
                  <NumField unit={unit} mm={s.sheetW} onMM={v=>updSig(s.id,{sheetW:v,...autoFitSheet(v,s.sheetH)})}
                    style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                    fontSize:"11px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <button onClick={()=>updSig(s.id,{sheetW:s.sheetH,sheetH:s.sheetW,...autoFitSheet(s.sheetH,s.sheetW)})} title="Swap Length ↔ Width"
                  style={{background:BG,border:`1px solid ${BD}`,borderRadius:"5px",padding:"4px 5px",
                  cursor:"pointer",color:MT,fontWeight:"800",fontSize:"11px",flexShrink:0,marginBottom:"1px"}}>⇄</button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Sheet W</div>
                  <NumField unit={unit} mm={s.sheetH} onMM={v=>updSig(s.id,{sheetH:v,...autoFitSheet(s.sheetW,v)})}
                    style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                    fontSize:"11px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>}

              <div style={{display:"flex",gap:"4px",marginBottom:"5px",alignItems:"flex-end"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Pages/sheet</div>
                  <FreeNum key={`pps-${s.id}-${s.pagesPerSheet}`} val={s.pagesPerSheet} onVal={v=>updSig(s.id,{pagesPerSheet:Math.max(v,1)})}
                    style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                    fontSize:"11px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Plate</div>
                  <select value={s.plateName||settings.plates[0]?.name} onChange={e=>{
                      const p=settings.plates.find(x=>x.name===e.target.value);
                      updSig(s.id,{plateName:e.target.value,plateRate:p?p.impRate:s.plateRate});
                    }}
                    style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                    fontSize:"10px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                    {settings.plates.map(p=><option key={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={()=>updSig(s.id,{sbsPlate:!s.sbsPlate})} title="Side by side plate"
                  style={{width:"26px",height:"24px",flexShrink:0,background:s.sbsPlate?C:BG,
                  border:`1.5px solid ${s.sbsPlate?C:BD}`,borderRadius:"5px",cursor:"pointer",
                  color:s.sbsPlate?"#fff":MT,fontWeight:"800",fontSize:"12px"}}>{s.sbsPlate?"✓":""}</button>
                <div style={{flex:"1.5",minWidth:0}}>
                  <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>side</div>
                  <select value={s.side} onChange={e=>updSig(s.id,{side:e.target.value})}
                    style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                    fontSize:"10px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                    <option>Single Side</option>
                    <option>Back&Back - Left-Right</option><option>Force Back&Back</option><option>Front&Back</option>
                  </select>
                </div>
              </div>
              {(()=>{const pl2=settings.plates.find(p=>p.name===(s.plateName||settings.plates[0]?.name));
                if(!pl2)return null;
                const exceeds=s.sheetW>pl2.maxL||s.sheetH>pl2.maxW;
                return exceeds?<div style={{background:"#FEE2E2",borderRadius:"6px",padding:"4px 8px",
                  marginBottom:"5px",fontSize:"9px",color:ERR,fontWeight:"700"}}>
                  ⚠ Sheet size exceeds {pl2.name}'s max sheet size ({fs(pl2.maxL)}×{fs(pl2.maxW)}).</div>:null;
              })()}
              {s.side==="Front&Back"&&<div style={{display:"flex",gap:"4px",marginBottom:"5px"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"7px",color:C,fontWeight:"700",marginBottom:"2px"}}>Front — Colors</div>
                  <select value={s.frontColors||4} onChange={e=>updSig(s.id,{frontColors:Number(e.target.value)})}
                    style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${C}`,borderRadius:"5px",
                    fontSize:"9px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                    {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"7px",color:M,fontWeight:"700",marginBottom:"2px"}}>Back — Colors</div>
                  <select value={s.backColors||1} onChange={e=>updSig(s.id,{backColors:Number(e.target.value)})}
                    style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${M}`,borderRadius:"5px",
                    fontSize:"9px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                    {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{background:BG,borderRadius:"6px",padding:"4px 6px",fontSize:"7px",
                  color:MT,fontWeight:"700",alignSelf:"flex-end",whiteSpace:"nowrap"}}>
                  overrides group colors</div>
              </div>}

              {/* Color group breakdown — colors per group selected via 1-8 dropdown */}
              {s.groups.map((g,gi)=>(
                <div key={gi} style={{display:"flex",gap:"4px",alignItems:"flex-end",marginBottom:"4px"}}>
                  <div style={{flex:"0 0 44px"}}>
                    <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Colors</div>
                    <select value={g.colors} onChange={e=>updGroup(s.id,gi,{colors:Number(e.target.value)})}
                      style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                      fontSize:"11px",textAlign:"center",fontWeight:"700",outline:"none",background:CARD,boxSizing:"border-box"}}>
                      {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>No of {g.colors} color pages</div>
                    <FreeNum val={g.pages} onVal={v=>updGroup(s.id,gi,{pages:v})}
                      style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                      fontSize:"11px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"8px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Plates</div>
                    <div style={{padding:"4px 2px",fontSize:"12px",textAlign:"center",fontWeight:"800",
                      color:tCol,background:tCol+"18",border:`1px solid ${tCol}55`,borderRadius:"5px"}}>{g.plates}</div>
                  </div>
                  {s.groups.length>1&&<button onClick={()=>rmGroup(s.id,gi)}
                    style={{background:"none",border:"none",color:ERR,cursor:"pointer",fontSize:"12px",
                    fontWeight:"700",padding:"4px 2px",flexShrink:0}}>✕</button>}
                </div>
              ))}
              <button onClick={()=>addGroup(s.id)} style={{background:"none",border:"none",color:C,
                fontSize:"10px",fontWeight:"700",cursor:"pointer",padding:"2px 0",marginBottom:"4px"}}>+ Add color group</button>
              {!/cover/i.test(s.name)&&s.groups.reduce((a,g)=>a+(g.pages||0),0)!==msTotalPages&&
                <div style={{background:"#FEF3C7",borderRadius:"6px",padding:"4px 8px",marginBottom:"4px",
                  fontSize:"9px",color:"#92400E",fontWeight:"700"}}>
                  ⚠ Color-group pages ({fmt(s.groups.reduce((a,g)=>a+(g.pages||0),0))}) don't match the
                  book's total pages ({fmt(msTotalPages)}) set at the top.</div>}

              {/* Totals for this signature */}
              <div style={{background:BG,borderRadius:"7px",padding:"6px 8px",marginTop:"4px"}}>
                {[["No of sheets Need",s.sheetsNeeded,""],
                  ["No of Papers",s.noOfPapers,""],
                  ["Paper cost.",s.paperCost,"Rs."]].map(([l,v,pre])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px"}}>
                    <span style={{fontSize:"10px",color:MT,fontWeight:"600"}}>{l}</span>
                    <span style={{fontSize:"12px",fontWeight:"800",color:T}}>{pre}{fmt(Math.round(v))}</span>
                  </div>
                ))}
              </div>

              {/* Auto Printing(Impression) cost — red, rate from Settings */}
              <div style={{background:"#FEF2F2",borderRadius:"7px",padding:"6px 9px",marginTop:"5px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:"10px",color:ERR,fontWeight:"700"}}>No of Impressions</span>
                  <span style={{fontSize:"11px",color:ERR,fontWeight:"800"}}>{fmt(s.impressions)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:"10px",color:ERR,fontWeight:"700"}}>Printing (Impression) cost.</span>
                  <span style={{fontSize:"12px",color:ERR,fontWeight:"800"}}>Rs.{fmt(Math.round(s.impressionCost))}</span>
                </div>
                <div style={{fontSize:"8px",color:"#B91C1C",marginTop:"2px"}}>
                  {s.totalPlates}plates × Rs.{s.plateRate}/plate (rate from Settings)</div>
              </div>

              {/* Plate — styled the same as the Paper / Impression summary boxes above */}
              <div style={{background:tCol+"12",borderRadius:"7px",padding:"6px 8px",marginTop:"5px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"10px",color:tCol,fontWeight:"700"}}>No of Plates</span>
                  <span style={{fontSize:"12px",fontWeight:"800",color:tCol}}>{fmt(s.totalPlates)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"10px",color:tCol,fontWeight:"700"}}>Plate cost.</span>
                  <span style={{fontSize:"12px",fontWeight:"800",color:tCol}}>Rs.{fmt(Math.round(s.plateCost))}</span>
                </div>
              </div>

              {/* Fields scoped to THIS Paper card only (e.g. Laminate just for Cover Page) */}
              <div style={{marginTop:"5px"}}>
                {Object.entries(s.sigCosts||{}).map(([k,c])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"3px 0",borderBottom:"1px solid #F3F4F6",marginBottom:"3px"}}>
                    <span style={{fontSize:"9px",color:MT,fontWeight:"600"}}>{c.l}</span>
                    <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                      <span style={{fontSize:"11px",fontWeight:"800",color:T}}>Rs.{fmt(Math.round(c.val))}</span>
                      <button onClick={()=>setFieldDialog({k,l:c.l,val:c.val,sigId:s.id})}
                        style={{background:"none",border:"none",color:C,fontSize:"10px",cursor:"pointer",padding:0}}>✎</button>
                      <button onClick={()=>{const nc2={...s.sigCosts};delete nc2[k];updSig(s.id,{sigCosts:nc2});}}
                        style={{background:"none",border:"none",color:ERR,fontSize:"10px",fontWeight:"700",cursor:"pointer",padding:0}}>✕</button>
                    </div>
                  </div>
                ))}
                <select value="" onChange={e=>{
                    if(!e.target.value)return;
                    setFieldDialog({k:e.target.value,l:e.target.value,val:0,sigId:s.id});
                  }}
                  style={{width:"100%",padding:"5px 8px",border:`1.5px dashed ${tCol}`,borderRadius:"7px",
                  fontSize:"9px",color:tCol,fontWeight:"700",outline:"none",background:CARD,boxSizing:"border-box"}}>
                  <option value="">+ Add field to {s.name}...</option>
                  {["Laminating","Positive","Foil Block","Foiling","Die Cutter","Die Cutting","Spot UV",
                    "Stripping","Numbering","Perforating","Creasing","Additional Raw Materials"]
                    .filter(l=>!(s.sigCosts||{})[l]).map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Planning sheet — hidden by default, same style as Single Sheet, book pages built in */}
              <button onClick={()=>updSig(s.id,{showPlan:!s.showPlan})} style={{width:"100%",marginTop:"5px",
                background:"none",border:"none",padding:"5px 0",cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:"10px",fontWeight:"700",color:tCol}}>
                  {s.showPlan?"▾":"▸"} Planning Sheet</span>
              </button>
              {s.showPlan&&s.totalRuns>0&&(()=>{
                const totalBookPages=s.groups.reduce((a,g)=>a+g.pages,0);
                const totalPlanPages=s.totalRuns;
                const pIdx=Math.min(s.planPageIdx||0,totalPlanPages-1);
                const pps=s.pagesPerSheet;
                // Canvas sizing — same conventions as Single Sheet's planning canvas
                // No gap between page cells for the book planning grid — pages sit edge to edge.
                const gapH2=0,gapV2=0;
                const grip2=s.plateGrip||13,eM2=5,cutMk2=s.cutMarkSz||3;
                // Real imposition: fit the actual Job L×W (from the top of this tab) onto the sheet —
                // this is what determines cols/rows, not a guessed square grid. Verified: 8.5"×5.5" job
                // on a 24"×18" sheet gives 4×2=8 ups, matching "8 pages/sheet" exactly.
                const jobFit=fitCalc(s.sheetW,s.sheetH,grip2,eM2,gapH2,msProdW,msProdH);
                const cols=s.planCols||jobFit.cols||1;
                const rows=s.planRows||jobFit.rows||1;
                const jobW=jobFit.rot?msProdH:msProdW;
                const jobH=jobFit.rot?msProdW:msProdH;
                const cellCount=cols*rows;
                // Self-correcting: pagesPerSheet must always equal the REAL computed grid (cols×rows).
                // The +/- button fix only covered manual grid clicks — this covers every other path
                // that changes the grid too (Job L/W edits, Sheet size changes, Paper changes...).
                if(pps!==cellCount&&cellCount>0){
                  updSig(s.id,{pagesPerSheet:cellCount});
                }
                const sheetIdx=Math.floor(pIdx/2);
                const isFrontPage=pIdx%2===0;
                const sigSize=pps*2;
                const chunkStart=sheetIdx*sigSize+1;
                const leaves=Math.floor(pps/2);
                const usesFolding=bindKey==="Saddle Stitch"||bindKey==="Perfect";
                const seq=[];
                // Verified exact leaf order — only valid for a genuine 4×2 (or 2×4) grid. Checking the
                // REAL computed shape here (not just "pps===8") is critical: if Job L/W × Sheet size
                // produces a different grid, forcing this template on it silently scrambles positions.
                const TEMPLATE_8UP={front:[7,8,12,3,11,4,0,15],back:[1,14,13,2,6,9,10,5]}; // 0-indexed offsets
                const gridMatches8Up=cellCount===8&&((cols===4&&rows===2)||(cols===2&&rows===4));
                if(usesFolding&&gridMatches8Up){
                  const t=isFrontPage?TEMPLATE_8UP.front:TEMPLATE_8UP.back;
                  t.forEach(off=>seq.push(chunkStart+off));
                }else if(usesFolding){
                  // Folded signature, other pages/sheet counts — pairing is mathematically correct
                  // (sums to sigSize+1) but exact leaf arrangement isn't verified for this size —
                  // edit cells if it doesn't match your bindery's convention.
                  for(let k=0;k<leaves;k++){
                    if(isFrontPage)seq.push(chunkStart+sigSize-1-2*k,chunkStart+2*k);
                    else seq.push(chunkStart+2*k+1,chunkStart+sigSize-2-2*k);
                  }
                }else{
                  // Spiral/Hard Cover — pages are cut apart flat, no folding, so no pairing needed:
                  // just straight sequential order, one plan page = one independent batch of pages.
                  for(let i=0;i<pps;i++)seq.push(pIdx*pps+i+1);
                }
                const CX2=230,CY2=170,sc2=Math.min(CX2/s.sheetW,CY2/s.sheetH);
                const dW2=Math.max(Math.round(s.sheetW*sc2),60),dH2=Math.max(Math.round(s.sheetH*sc2),60);
                const gPx2=Math.round(grip2*sc2),ePx2=Math.round(eM2*sc2);
                const jWp2=Math.round(jobW*sc2),jHp2=Math.round(jobH*sc2);
                const gHp2=Math.round(gapH2*sc2),gVp2=Math.round(gapV2*sc2);
                const lWp2=cols*jWp2+(cols-1)*gHp2,lHp2=rows*jHp2+(rows-1)*gVp2;
                const sX2=ePx2+Math.max(0,Math.round(((dW2-2*ePx2)-lWp2)/2));
                const sY2=gPx2+Math.max(0,Math.round(((dH2-gPx2-ePx2)-lHp2)/2));
                const sfO2=Math.round(8*sc2);
                return(
                <div style={{marginTop:"4px"}}>
                  {/* Cols/Rows adjust */}
                  <div style={{display:"flex",justifyContent:"center",gap:"8px",marginBottom:"6px"}}>
                    {[["Columns",cols,c=>updSig(s.id,{planCols:Math.max(1,c-1),pagesPerSheet:Math.max(1,c-1)*rows}),
                        c=>updSig(s.id,{planCols:c+1,pagesPerSheet:(c+1)*rows}),C],
                      ["Rows",rows,r=>updSig(s.id,{planRows:Math.max(1,r-1),pagesPerSheet:cols*Math.max(1,r-1)}),
                        r=>updSig(s.id,{planRows:r+1,pagesPerSheet:cols*(r+1)}),M]
                    ].map(([lbl,val,dec,inc,col])=>(
                      <div key={lbl} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
                        <span style={{fontSize:"7px",color:col,fontWeight:"700"}}>{lbl}</span>
                        <div style={{display:"flex",gap:"1px",alignItems:"center"}}>
                          <button onClick={()=>dec(val)} style={{width:"18px",height:"20px",flexShrink:0,background:BG,
                            border:`1px solid ${col}`,borderRadius:"3px 0 0 3px",cursor:"pointer",fontWeight:"800",
                            color:col,fontSize:"11px"}}>−</button>
                          <span style={{width:"20px",textAlign:"center",fontSize:"11px",fontWeight:"800",color:col}}>{val}</span>
                          <button onClick={()=>inc(val)} style={{width:"18px",height:"20px",flexShrink:0,background:col+"20",
                            border:`1px solid ${col}`,borderRadius:"0 3px 3px 0",cursor:"pointer",fontWeight:"800",
                            color:col,fontSize:"11px"}}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Cut Mark / Plate Grip / Binding */}
                  <div style={{display:"flex",gap:"4px",marginBottom:"6px"}}>
                    {[["Cut Mark",cutMk2,v=>updSig(s.id,{cutMarkSz:v}),K],["Plate Grip",grip2,v=>updSig(s.id,{plateGrip:v}),WARN]
                    ].map(([lbl,val,set,col])=>(
                      <div key={lbl} style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"7px",color:MT,fontWeight:"600",marginBottom:"2px",textAlign:"center"}}>{lbl}</div>
                        <NumField unit={unit} mm={val} onMM={set}
                          style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${col}`,borderRadius:"5px",
                          fontSize:"10px",textAlign:"center",color:col,fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
                      </div>
                    ))}
                    <div style={{flex:"1.4",minWidth:0}}>
                      <div style={{fontSize:"7px",color:MT,fontWeight:"600",marginBottom:"2px",textAlign:"center"}}>Binding</div>
                      <select value={bindKey} onChange={e=>setBindKey(e.target.value)}
                        style={{width:"100%",padding:"4px 2px",border:`1.5px solid ${BD}`,borderRadius:"5px",
                        fontSize:"9px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                        {Object.keys(BIND_RATES).map(b=><option key={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{fontSize:"8px",color:MT,marginBottom:"3px",textAlign:"center"}}>
                    1 page: {fs(jobW)}×{fs(jobH)}
                  </div>
                  {/* Cut Marks / Safe Area toggles */}
                  <div style={{display:"flex",gap:"4px",marginBottom:"6px"}}>
                    <Tog lbl="Cut Marks" on={s.cutMarksOn} cb={()=>updSig(s.id,{cutMarksOn:!s.cutMarksOn})} col={K}/>
                    <Tog lbl="Safe Area" on={s.safeArea} cb={()=>updSig(s.id,{safeArea:!s.safeArea})} col={SUC}/>
                  </div>
                  <div style={{fontSize:"8px",color:tCol,fontWeight:"700",marginBottom:"4px",textAlign:"center"}}>
                    {usesFolding?`Sheet ${sheetIdx+1} — ${isFrontPage?"Front":"Back"}`:`Page batch ${pIdx+1}`} ({bindKey}) · {totalBookPages} pages in {totalPlanPages} sheet-sides
                  </div>
                  {/* Canvas */}
                  <div style={{width:`${dW2}px`,height:`${dH2}px`,background:"#fff",border:`2px solid ${K}`,
                    position:"relative",margin:"0 auto",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:`${gPx2}px`,
                      background:"rgba(150,150,150,0.18)",borderBottom:`1px dashed ${MT}`}}/>
                    {s.safeArea&&<div style={{position:"absolute",pointerEvents:"none",
                      top:`${gPx2+sfO2}px`,left:`${ePx2+sfO2}px`,
                      width:`${Math.max(dW2-2*ePx2-2*sfO2,0)}px`,height:`${Math.max(dH2-gPx2-ePx2-2*sfO2,0)}px`,
                      border:`1px dashed ${SUC}`}}/>}
                    {Array.from({length:cellCount}).map((_,ci)=>{
                      const r=Math.floor(ci/cols),c=ci%cols;
                      const x=sX2+c*(jWp2+gHp2),y=sY2+r*(jHp2+gVp2);
                      if(x+jWp2>dW2||y+jHp2>dH2)return null;
                      const key=`${pIdx}-${ci}`;
                      const autoVal=seq[ci];
                      const val=s.pageNumbers[key]??((autoVal&&autoVal<=totalBookPages)?autoVal:"");
                      const cellCol=[C,M,"#D4A000",SUC][ci%4];
                      return(
                        <input key={ci} value={val}
                          onChange={e=>updSig(s.id,{pageNumbers:{...s.pageNumbers,[key]:e.target.value}})}
                          style={{position:"absolute",left:`${x}px`,top:`${y}px`,width:`${jWp2}px`,height:`${jHp2}px`,
                          border:`0.5px solid ${cellCol}`,textAlign:"center",fontSize:"9px",fontWeight:"700",
                          color:cellCol,outline:"none",boxSizing:"border-box",background:cellCol+"22",padding:0}}/>
                      );
                    })}
                    {s.cutMarksOn&&Array.from({length:4}).map((_,ci)=>{
                      const positions=[[0,0],[dW2-1,0],[0,dH2-1],[dW2-1,dH2-1]];
                      const[cx,cy]=positions[ci];
                      return<div key={ci} style={{position:"absolute",left:`${cx-3}px`,top:`${cy-3}px`,
                        width:"6px",height:"6px",border:`1px solid ${K}`,pointerEvents:"none"}}/>;
                    })}
                  </div>
                  <div style={{fontSize:"8px",color:MT,marginTop:"4px",marginBottom:"6px",textAlign:"center"}}>
                    Grid from your Job L×W on this sheet: <b>{cols}×{rows} = {cellCount} ups</b>
                    {pps!==cellCount&&<span style={{color:ERR}}> (⚠ Pages/sheet field says {pps} — doesn't match! Update it to {cellCount} for correct costs.)</span>}
                  </div>
                  <div style={{fontSize:"8px",color:MT,marginBottom:"6px",textAlign:"center"}}>
                    {usesFolding
                      ?(gridMatches8Up
                        ?<>✓ Exact verified imposition order (4×2 grid, {bindKey}).</>
                        :<>Pairs auto-fill so Front+Back sum to {sigSize+1} ({bindKey}) — leaf order not yet
                          verified for a {cols}×{rows} grid, edit cells if needed.</>)
                      :<>{bindKey} doesn't fold — pages are simply cut apart, so numbers auto-fill sequentially.</>}
                  </div>
                  {/* CorelDraw-style page navigator */}
                  <div style={{display:"flex",alignItems:"center",gap:"4px",marginBottom:"3px"}}>
                    <button onClick={()=>updSig(s.id,{planPageIdx:0})} disabled={pIdx===0}
                      style={{border:"none",background:"none",color:pIdx===0?BD:tCol,cursor:pIdx===0?"default":"pointer",
                      fontSize:"11px",padding:"2px 4px"}}>|◂</button>
                    <button onClick={()=>updSig(s.id,{planPageIdx:Math.max(0,pIdx-1)})} disabled={pIdx===0}
                      style={{border:"none",background:"none",color:pIdx===0?BD:tCol,cursor:pIdx===0?"default":"pointer",
                      fontSize:"11px",padding:"2px 4px"}}>◂</button>
                    <span style={{fontSize:"9px",color:MT,fontWeight:"600",minWidth:"46px",textAlign:"center"}}>
                      {pIdx+1} of {totalPlanPages}</span>
                    <button onClick={()=>updSig(s.id,{planPageIdx:Math.min(totalPlanPages-1,pIdx+1)})} disabled={pIdx===totalPlanPages-1}
                      style={{border:"none",background:"none",color:pIdx===totalPlanPages-1?BD:tCol,
                      cursor:pIdx===totalPlanPages-1?"default":"pointer",fontSize:"11px",padding:"2px 4px"}}>▸</button>
                    <button onClick={()=>updSig(s.id,{planPageIdx:totalPlanPages-1})} disabled={pIdx===totalPlanPages-1}
                      style={{border:"none",background:"none",color:pIdx===totalPlanPages-1?BD:tCol,
                      cursor:pIdx===totalPlanPages-1?"default":"pointer",fontSize:"11px",padding:"2px 4px"}}>▸|</button>
                  </div>
                  <div style={{display:"flex",gap:"0",borderBottom:`1px solid ${BD}`,overflowX:"auto"}}>
                    {Array.from({length:totalPlanPages}).map((_,i)=>(
                      <button key={i} onClick={()=>updSig(s.id,{planPageIdx:i})}
                        style={{padding:"4px 8px",border:"none",borderBottom:`2px solid ${i===pIdx?tCol:"transparent"}`,
                        background:"none",color:i===pIdx?tCol:MT,fontWeight:i===pIdx?"700":"600",
                        fontSize:"9px",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                        Page {i+1}</button>
                    ))}
                  </div>
                </div>
              );})()}
              </>}
            </div>
          );})}

          <div style={{padding:"0 8px",marginTop:"6px"}}>
            <button onClick={addSig} style={{width:"100%",background:CL,border:`1.5px dashed ${C}`,
              borderRadius:"9px",padding:"8px",color:C,fontWeight:"700",cursor:"pointer",fontSize:"12px"}}>
              + Add Paper / Signature</button>
          </div>
          </>}

          {/* ══ 4. CALCULATION ══ */}
          <div style={{background:CARD,margin:"6px 8px 0",borderRadius:"12px",padding:"9px",
            boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"7px"}}>📊 Calculation</div>

            {activeTab==="single"?<>
            {/* Paper — auto from plan sheet (compulsory) */}
            <div style={{paddingBottom:"6px",marginBottom:"6px",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:"11px",color:T,fontWeight:"700"}}>Paper ●</div>
                <div style={{fontSize:"12px",fontWeight:"800",color:T}}>Rs.{Math.round(papC).toLocaleString()}</div>
              </div>
              <div style={{fontSize:"9px",color:MT,marginTop:"2px"}}>
                {pp.n} — {fmt(nPap)} Papers × Rs.{pRate}/- each = Rs.{Math.round(papC).toLocaleString()}</div>
            </div>

            {/* Plate — auto from plan sheet (compulsory) — SBS checkbox lives here now */}
            <div style={{marginBottom:"6px",paddingBottom:"6px",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:"11px",color:T,fontWeight:"700"}}>Plate ● — {platK}{sbsOn?" (SbS÷2)":""}</div>
                <div style={{fontSize:"12px",fontWeight:"800",color:T}}>Rs.{Math.round(platC).toLocaleString()}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"5px",marginTop:"4px"}}>
                <button onClick={()=>setSbs(!sbs)}
                  style={{width:"14px",height:"14px",flexShrink:0,padding:0,border:`1.5px solid ${sbs?T:BD}`,
                  borderRadius:"3px",background:sbs?T:"#fff",color:"#fff",fontSize:"10px",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>{sbs?"✓":""}</button>
                <span style={{fontSize:"10px",color:MT,fontWeight:"600"}}>Side by side plate</span>
              </div>
              {sbs&&!sbsOK&&<div style={{marginTop:"4px"}}>
                <div style={{fontSize:"9px",color:ERR,fontWeight:"700"}}>
                  ⚠ Sheet exceeds half the plate's print area for side-by-side.</div>
              </div>}
            </div>

            {/* Printing (Impression) — auto from Settings rate */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              paddingBottom:"6px",marginBottom:"6px",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{fontSize:"11px",color:T,fontWeight:"700"}}>Printing (Impression) ● — {fmt(imp)} imp</div>
              <div style={{fontSize:"12px",fontWeight:"800",color:T}}>Rs.{Math.round(printImpCost).toLocaleString()}</div>
            </div>
            <div style={{background:BG,borderRadius:"8px",padding:"6px 9px",marginBottom:"6px",borderLeft:`3px solid ${C}`}}>
              <div style={{fontSize:"8px",color:MT,fontWeight:"700",marginBottom:"2px",textTransform:"uppercase"}}>Impressions</div>
              <div style={{fontSize:"11px",color:T,fontWeight:"700",lineHeight:1.7}}>
                {fmt(qty)} ÷ {ups} = {fmt(aSh)}sh
                {bbA&&<span style={{color:M}}> ×2={fmt(aSh*2)}</span>}
                {" → "}{fmt(chSh)} × {effNc}C
                {" = "}<span style={{color:C,fontWeight:"800"}}>{fmt(imp)} imp</span>
              </div>
              {(bbA?aSh*2:aSh)!==chSh&&<div style={{fontSize:"9px",color:WARN,fontWeight:"700",marginTop:"2px"}}>
                ⚠ {fmt(bbA?aSh*2:aSh)} → UP to {fmt(chSh)}</div>}
            </div>
            </>:
            /* Multi-Sheet: Paper/Plate/Printing shown SEPARATELY per signature — each may use a
               different plate/rate, so a single mixed total would misreport the real cost. */
            <div style={{marginBottom:"6px"}}>
              {msCalcs.map((s,i)=>(
                <div key={s.id} style={{background:BG,borderRadius:"8px",padding:"7px 9px",marginBottom:"6px"}}>
                  <div style={{fontSize:"10px",fontWeight:"800",color:i%2===0?C:M,marginBottom:"4px"}}>{s.name}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                    <span style={{fontSize:"10px",color:MT,fontWeight:"600"}}>Paper ● — {fmt(s.noOfPapers)} papers</span>
                    <span style={{fontSize:"12px",fontWeight:"800",color:T}}>Rs.{fmt(Math.round(s.paperCost))}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}>
                    <span style={{fontSize:"10px",color:MT,fontWeight:"600"}}>Plate ● — {s.totalPlates} plates ({s.plateName||"—"})</span>
                    <span style={{fontSize:"12px",fontWeight:"800",color:T}}>Rs.{fmt(Math.round(s.plateCost))}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:"10px",color:MT,fontWeight:"600"}}>Printing (Impression) ● — {fmt(s.impressions)} imp</span>
                    <span style={{fontSize:"12px",fontWeight:"800",color:T}}>Rs.{fmt(Math.round(s.impressionCost))}</span>
                  </div>
                  {Object.entries(s.sigCosts||{}).map(([k,c])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",marginTop:"2px"}}>
                      <span style={{fontSize:"10px",color:MT,fontWeight:"600"}}>{c.l}</span>
                      <span style={{fontSize:"12px",fontWeight:"800",color:T}}>Rs.{fmt(Math.round(c.val))}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>}

            {/* Optional fields — pick from one dropdown, shown 2/row (odd one out spans full width) */}
            {(()=>{
              const defs=[
                {k:"artwork",l:"Artwork",val:artwork,set:setArtwork},
                {k:"planning",l:"Planning",val:planning,set:setPlanning},
                {k:"cutting",l:"Cutting (Guillotine)",val:cutting,set:setCutting},
                {k:"positive",l:"Positive",special:"positive"},
                ...(activeTab==="single"?[{k:"laminate",l:"Laminating",special:"laminate"}]:[]),
                {k:"dieCutter",l:"Die Cutter",val:dieCutter,set:setDieCutter},
                {k:"dieCutImp",l:"Die Cutting",val:dieCutImp,set:setDieCutImp,hasDD:true,ddOpts:settings.dieCutters.map(d=>d.name),ddKey:dieCutMachine,setDdk:setDieCutMachine},
                {k:"foilBlock",l:"Foil Block",val:foilBlock,set:setFoilBlock},
                {k:"foiling",l:"Foiling",val:foiling,set:setFoiling},
                {k:"spotUV",l:"Spot UV",val:spotUV,set:setSpotUV},
                {k:"folding",l:"Folding",val:folding,set:setFolding,hasDD:true,ddOpts:Object.keys(FOLD_RATES),ddKey:foldKey,setDdk:setFoldKey},
                {k:"gathering",l:"Gathering",val:gathering,set:setGathering},
                {k:"binding",l:"Binding",val:binding,set:setBinding,hasDD:true,ddOpts:Object.keys(BIND_RATES),ddKey:bindKey,setDdk:setBindKey},
                {k:"pasting",l:"Pasting",val:pasting,set:setPasting},
                {k:"rimming",l:"Rimming",val:rimming,set:setRimming},
                {k:"stripping",l:"Stripping",val:stripping,set:setStripping},
                {k:"numbering",l:"Numbering",val:numbering,set:setNumbering},
                {k:"perforating",l:"Perforating",val:perforating,set:setPerforating},
                {k:"creasing",l:"Creasing",val:creasing,set:setCreasing},
                {k:"addMat",l:"Additional Raw Materials",val:addMat,set:setAddMat},
                {k:"transport",l:"Transport",val:transport,set:setTransport},
              ];
              const notEnabled=defs.filter(d=>!enabledCosts[`${activeTab}:${d.k}`]);
              const enabled=defs.filter(d=>enabledCosts[`${activeTab}:${d.k}`]);
              return(<>
                <div>
                  {enabled.map((d,i)=>{
                    if(d.special==="laminate")return(
                      <div key="laminate" style={{marginBottom:"6px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px"}}>
                          <span style={{fontSize:"10px",color:M,fontWeight:"700"}}>Laminating</span>
                          <button onClick={()=>toggleCost("laminate")} style={{background:"none",border:"none",
                            color:ERR,fontSize:"12px",cursor:"pointer",fontWeight:"700",padding:0}}>✕</button>
                        </div>
                        <div style={{display:"flex",gap:"4px",marginBottom:"4px"}}>
                          <select value={lamK} onChange={e=>{setLamK(e.target.value);setLamCust(null);}}
                            style={{flex:1,padding:"5px 4px",border:`1.5px solid ${M}`,borderRadius:"7px",
                            fontSize:"11px",outline:"none",background:CARD,boxSizing:"border-box"}}>
                            {[...settings.laminates.map(l=>l.name),"No Laminate"].map(n=><option key={n}>{n}</option>)}
                          </select>
                          <div style={{fontSize:"12px",fontWeight:"800",color:T,alignSelf:"center",flexShrink:0}}>
                            Rs.{Math.round(lamC).toLocaleString()}</div>
                        </div>
                        <div style={{display:"flex",gap:"10px",marginBottom:"4px"}}>
                          {[["Single Side",false],["Both Side",true]].map(([lbl,v])=>(
                            <div key={lbl} onClick={()=>setLamBoth(v)} style={{display:"flex",alignItems:"center",
                              gap:"4px",cursor:"pointer"}}>
                              <div style={{width:"12px",height:"12px",border:`1.5px solid ${lamBoth===v?M:BD}`,
                                borderRadius:"3px",background:lamBoth===v?M:"#fff",display:"flex",
                                alignItems:"center",justifyContent:"center"}}>
                                {lamBoth===v&&<span style={{color:"#fff",fontSize:"8px",lineHeight:1}}>✓</span>}
                              </div>
                              <span style={{fontSize:"9px",color:MT,fontWeight:"600"}}>{lbl}</span>
                            </div>
                          ))}
                        </div>
                        {lamK!=="No Laminate"&&<div style={{background:ML,borderRadius:"6px",padding:"5px 8px",
                          fontSize:"9px",color:M,fontWeight:"600"}}>
                          {fs(lamJW)}×{fs(lamJH)} = {(Math.round(lamSq*100)/100).toFixed(2)} sq.in × Rs.{lRate} × {nPap}sh{lamBoth?" × 2 (both side)":""}</div>}
                      </div>
                    );
                    if(d.special==="positive")return(
                      <div key="positive" style={{marginBottom:"6px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px"}}>
                          <span style={{fontSize:"10px",color:MT,fontWeight:"600"}}>Positive</span>
                          <button onClick={()=>toggleCost("positive")} style={{background:"none",border:"none",
                            color:ERR,fontSize:"12px",cursor:"pointer",fontWeight:"700",padding:0}}>✕</button>
                        </div>
                        <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                          <NumField unit={unit} mm={positiveL} onMM={setPositiveL}
                            style={{flex:1,padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                            fontSize:"11px",textAlign:"center",outline:"none",boxSizing:"border-box"}} placeholder="L"/>
                          <NumField unit={unit} mm={positiveW} onMM={setPositiveW}
                            style={{flex:1,padding:"5px 3px",border:`1.5px solid ${BD}`,borderRadius:"6px",
                            fontSize:"11px",textAlign:"center",outline:"none",boxSizing:"border-box"}} placeholder="W"/>
                          <span style={{fontSize:"12px",fontWeight:"800",color:T,flexShrink:0}}>Rs.{Math.round(positive)}</span>
                        </div>
                      </div>
                    );
                    return(
                      <div key={d.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                        paddingBottom:"6px",marginBottom:"6px",borderBottom:"1px solid #F3F4F6"}}>
                        <div style={{fontSize:"11px",color:T,fontWeight:"700"}}>
                          {d.l}{d.hasDD&&d.ddKey?` (${d.ddKey})`:""}</div>
                        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                          <span style={{fontSize:"12px",fontWeight:"800",color:T}}>Rs.{Math.round(d.val).toLocaleString()}</span>
                          <button onClick={()=>setFieldDialog({...d,val:d.val})}
                            style={{background:"none",border:"none",color:C,fontSize:"12px",cursor:"pointer",padding:0}}>✎</button>
                          <button onClick={()=>{toggleCost(d.k);d.set(0);}}
                            style={{background:"none",border:"none",color:ERR,fontSize:"12px",fontWeight:"700",cursor:"pointer",padding:0}}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {notEnabled.length>0&&<select value="" onChange={e=>{
                    const d=notEnabled.find(x=>x.k===e.target.value);
                    if(d)setFieldDialog({...d,val:0});
                  }}
                  style={{width:"100%",padding:"6px 8px",border:`1.5px dashed ${C}`,borderRadius:"7px",
                  fontSize:"11px",color:C,fontWeight:"700",outline:"none",background:CARD,marginBottom:"6px",boxSizing:"border-box"}}>
                  <option value="">+ Add field...</option>
                  {notEnabled.map(d=><option key={d.k} value={d.k}>{d.l}</option>)}
                </select>}
              </>);
            })()}

            {/* Add/Edit field dialog */}
            {fieldDialog&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,
              display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setFieldDialog(null)}>
              <div onClick={e=>e.stopPropagation()} style={{background:CARD,borderRadius:"12px",padding:"14px",
                width:"240px",boxShadow:"0 8px 24px rgba(0,0,0,0.25)"}}>
                <div style={{fontSize:"12px",fontWeight:"800",color:T,marginBottom:"10px"}}>{fieldDialog.l}</div>
                {fieldDialog.hasDD&&<select value={fieldDialog.ddKey} onChange={e=>{fieldDialog.setDdk(e.target.value);setFieldDialog({...fieldDialog,ddKey:e.target.value});}}
                  style={{width:"100%",padding:"7px",border:`1.5px solid ${BD}`,borderRadius:"8px",
                  fontSize:"12px",outline:"none",background:CARD,boxSizing:"border-box",marginBottom:"8px"}}>
                  {fieldDialog.ddOpts.map(o=><option key={o}>{o}</option>)}
                </select>}
                <div style={{fontSize:"9px",color:MT,fontWeight:"600",marginBottom:"3px"}}>Value (Rs.)</div>
                <FreeNum val={fieldDialog.val} onVal={v=>setFieldDialog({...fieldDialog,val:v})}
                  style={{width:"100%",padding:"8px",border:`1.5px solid ${C}`,borderRadius:"8px",
                  fontSize:"13px",textAlign:"right",fontWeight:"700",outline:"none",boxSizing:"border-box",marginBottom:"12px"}}/>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>setFieldDialog(null)} style={{flex:1,padding:"8px",background:BG,
                    border:`1px solid ${BD}`,borderRadius:"8px",color:MT,fontWeight:"700",cursor:"pointer",fontSize:"12px"}}>Cancel</button>
                  <button onClick={()=>{
                      if(fieldDialog.sigId){
                        updSig(fieldDialog.sigId,{sigCosts:{...(msSigs.find(x=>x.id===fieldDialog.sigId)||{}).sigCosts,[fieldDialog.k]:{l:fieldDialog.l,val:fieldDialog.val}}});
                      }else{
                        if(fieldDialog.set)fieldDialog.set(fieldDialog.val);
                        toggleCost(fieldDialog.k);
                      }
                      setFieldDialog(null);
                    }}
                    style={{flex:1,padding:"8px",background:K,border:"none",borderRadius:"8px",color:"#fff",
                    fontWeight:"700",cursor:"pointer",fontSize:"12px"}}>OK</button>
                </div>
              </div>
            </div>}

            {/* Booklet cost summary */}
            {activeTab==="single"&&bk&&sheets.length>0&&(
              <div style={{background:"#F5F3FF",borderRadius:"8px",padding:"7px 9px",marginBottom:"6px"}}>
                <div style={{fontSize:"10px",color:"#7C3AED",fontWeight:"700",marginBottom:"3px"}}>
                  📚 Booklet Sheets ({sheets.length})</div>
                {sheets.map((s,i)=>(
                  <div key={s.id} style={{display:"flex",justifyContent:"space-between",
                    fontSize:"10px",color:T,marginBottom:"2px"}}>
                    <span>{s.type} — {s.colors} — {s.pages}pp — {s.paper}</span>
                    <span style={{fontWeight:"700"}}>Rs.{s.cost.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Profit + Tax */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px",
              marginBottom:"7px",paddingTop:"6px",borderTop:"1px solid #F3F4F6"}}>
              <div>
                <div style={{fontSize:"9px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Profit Margin %</div>
                <FreeNum val={profit} onVal={setProfit}
                  style={{width:"100%",padding:"6px",border:`1.5px solid ${SUC}`,borderRadius:"7px",
                  fontSize:"12px",textAlign:"center",fontWeight:"700",color:SUC,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:"9px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Tax %</div>
                <FreeNum val={tax} onVal={setTax}
                  style={{width:"100%",padding:"6px",border:`1.5px solid ${BD}`,borderRadius:"7px",
                  fontSize:"12px",textAlign:"center",fontWeight:"700",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* Totals */}
            {[["Subtotal",subtotal],["Profit",profitAmt],["Tax",taxAmt]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                marginBottom:"4px",paddingBottom:"4px",borderBottom:"1px solid #F9F9F9"}}>
                <span style={{fontSize:"11px",color:MT,fontWeight:"600"}}>{l}</span>
                <span style={{fontSize:"12px",fontWeight:"700",color:T}}>Rs.{Math.round(v).toLocaleString()}</span>
              </div>
            ))}

            <div style={{background:K,borderRadius:"10px",overflow:"hidden",marginTop:"4px"}}>
              <Bar/>
              <div style={{padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{color:"#fff",fontWeight:"700",fontSize:"12px"}}>Total</div>
                  <div style={{color:C,fontSize:"11px",fontWeight:"700"}}>Rs.{(total/(activeTab==="single"?qty:msQty)).toFixed(2)}/pc</div>
                </div>
                <span style={{color:Y,fontWeight:"800",fontSize:"19px"}}>Rs.{Math.round(total).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ══ BOOKLET SHEETS (when booklet on) ══ */}
          {activeTab==="single"&&bk&&<div style={{background:CARD,margin:"6px 8px 0",borderRadius:"12px",padding:"9px",
            boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:"#7C3AED",marginBottom:"7px"}}>
              📚 Booklet — Sheet Plans</div>
            {sheets.length===0&&<div style={{fontSize:"11px",color:MT,textAlign:"center",
              padding:"10px 0"}}>No sheets added yet. Tap + to add cover, text or photo pages.</div>}
            {sheets.map((s,i)=>{
              const tCol=["Cover Page","Back Cover"].includes(s.type)?C:s.type==="Photo Pages"?Y:M;
              return(
              <div key={s.id} style={{background:BG,borderRadius:"8px",padding:"7px",
                marginBottom:"5px",display:"flex",gap:"7px",alignItems:"flex-start"}}>
                <MiniCanvas pw={sheetL} ph={sheetH} jw={s.rot?s.pageH:s.pageW} jh={s.rot?s.pageW:s.pageH}
                  cols={s.cols} rows={s.rows} col={tCol}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{fontSize:"11px",fontWeight:"700",color:T}}>{s.type}</div>
                    <button onClick={()=>setSheets(sh=>sh.filter(x=>x.id!==s.id))}
                      style={{background:"#FEE2E2",border:"none",borderRadius:"4px",
                      padding:"2px 5px",color:ERR,fontWeight:"700",cursor:"pointer",fontSize:"10px",flexShrink:0}}>✕</button>
                  </div>
                  <div style={{fontSize:"9px",color:MT,marginBottom:"3px"}}>{s.colors} · {s.paper} · {s.pages}pp</div>
                  <div style={{fontSize:"9px",color:tCol,fontWeight:"700"}}>
                    {s.cols}×{s.rows} = {s.ups} ups{s.rot?" ↺":""} · {fmt(s.sh)} sheets
                  </div>
                  <div style={{fontSize:"12px",fontWeight:"800",color:K,marginTop:"2px"}}>Rs.{s.cost.toLocaleString()}</div>
                </div>
              </div>
            );})}
          </div>}

          <div style={{padding:"7px 8px 80px"}}>
            <button onClick={()=>setSaved(true)} style={{width:"100%",background:K,border:"none",
              borderRadius:"12px",padding:"0",color:"#fff",cursor:"pointer",overflow:"hidden"}}>
              <Bar/>
              <div style={{padding:"13px",fontSize:"14px",fontWeight:"700"}}>
                {saved?"✓ Saved — Return to Quotation":"Save & Apply to Quotation →"}</div>
            </button>
          </div>
        </div>}

        {/* ══ SETTINGS SCREEN ══ */}
        {screen==="settings"&&<div style={{flex:1,overflowY:"auto",overflowX:"hidden",background:BG,padding:"8px"}}>
          {/* Paper */}
          <div style={{background:CARD,borderRadius:"12px",padding:"9px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"6px"}}>Paper</div>
            {settings.papers.map(p=>(
              <div key={p.id} style={{background:BG,borderRadius:"8px",padding:"6px 8px",marginBottom:"5px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px"}}>
                  <input value={p.name} onChange={e=>setSettings(s=>({...s,papers:s.papers.map(x=>x.id===p.id?{...x,name:e.target.value}:x)}))}
                    style={{border:"none",background:"transparent",fontSize:"12px",fontWeight:"700",outline:"none",flex:1}}/>
                  <button onClick={()=>setSettings(s=>({...s,papers:s.papers.filter(x=>x.id!==p.id)}))}
                    style={{background:"none",border:"none",color:ERR,cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>✕</button>
                </div>
                <div style={{display:"flex",gap:"4px"}}>
                  {[["GSM",p.gsm,v=>({gsm:v}),false],["L",p.l,v=>({l:v}),true],["W",p.w,v=>({w:v}),true],
                    ["Pack Rs",p.packPrice,v=>({packPrice:v}),false],["Sheets/pack",p.packSheets,v=>({packSheets:v}),false]].map(([lbl,val,patch,isSize])=>(
                    <div key={lbl} style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"8px",color:MT,fontWeight:"600"}}>{lbl}</div>
                      {isSize
                        ?<NumField unit={unit} mm={val} onMM={v=>setSettings(s=>({...s,papers:s.papers.map(x=>x.id===p.id?{...x,...patch(v)}:x)}))}
                          style={{width:"100%",padding:"3px",border:`1px solid ${BD}`,borderRadius:"4px",fontSize:"10px",textAlign:"center",boxSizing:"border-box"}}/>
                        :<FreeNum val={val} onVal={v=>setSettings(s=>({...s,papers:s.papers.map(x=>x.id===p.id?{...x,...patch(v)}:x)}))}
                          style={{width:"100%",padding:"3px",border:`1px solid ${BD}`,borderRadius:"4px",fontSize:"10px",textAlign:"center",boxSizing:"border-box"}}/>}
                    </div>
                  ))}
                </div>
                <div style={{fontSize:"8px",color:MT,marginTop:"2px",marginBottom:"4px"}}>Rs/sheet: {p.packSheets?(p.packPrice/p.packSheets).toFixed(2):"0.00"}</div>
                <div style={{fontSize:"8px",color:MT,fontWeight:"700",marginBottom:"3px"}}>Frequent Sheet Sizes</div>
                {(p.sheetSizes||[]).map((sp,si)=>(
                  <div key={si} style={{display:"flex",gap:"4px",alignItems:"center",marginBottom:"3px"}}>
                    <span style={{fontSize:"8px",color:MT,flexShrink:0}}>L</span>
                    <NumField unit={unit} mm={sp.l} onMM={v=>setSettings(s=>({...s,papers:s.papers.map(x=>x.id===p.id?{...x,sheetSizes:x.sheetSizes.map((y,yi)=>yi===si?{...y,l:v}:y)}:x)}))}
                      style={{flex:1,padding:"3px",border:`1px solid ${BD}`,borderRadius:"4px",fontSize:"9px",textAlign:"center"}}/>
                    <span style={{fontSize:"8px",color:MT,flexShrink:0}}>W</span>
                    <NumField unit={unit} mm={sp.w} onMM={v=>setSettings(s=>({...s,papers:s.papers.map(x=>x.id===p.id?{...x,sheetSizes:x.sheetSizes.map((y,yi)=>yi===si?{...y,w:v}:y)}:x)}))}
                      style={{flex:1,padding:"3px",border:`1px solid ${BD}`,borderRadius:"4px",fontSize:"9px",textAlign:"center"}}/>
                    <button onClick={()=>setSettings(s=>({...s,papers:s.papers.map(x=>x.id===p.id?{...x,sheetSizes:x.sheetSizes.filter((_,yi)=>yi!==si)}:x)}))}
                      style={{background:"none",border:"none",color:ERR,cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>setSettings(s=>({...s,papers:s.papers.map(x=>x.id===p.id?{...x,sheetSizes:[...(x.sheetSizes||[]),{l:x.l/2,w:x.w/2}]}:x)}))}
                  style={{width:"100%",background:CARD,border:`1px dashed ${BD}`,borderRadius:"6px",padding:"4px",color:MT,fontWeight:"700",cursor:"pointer",fontSize:"9px"}}>+ Add sheet size</button>
              </div>
            ))}
            <button onClick={()=>setSettings(s=>({...s,papers:[...s.papers,{id:Date.now(),name:"New Paper",gsm:100,l:900,w:600,packPrice:5000,packSheets:500}]}))}
              style={{width:"100%",background:BG,border:`1.5px dashed ${BD}`,borderRadius:"8px",padding:"7px",color:MT,fontWeight:"700",cursor:"pointer",fontSize:"11px"}}>+ Add New Paper</button>
          </div>

          {/* Plate */}
          <div style={{background:CARD,borderRadius:"12px",padding:"9px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"6px"}}>Plate</div>
            {settings.plates.map(p=>(
              <div key={p.id} style={{background:BG,borderRadius:"8px",padding:"6px 8px",marginBottom:"5px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px"}}>
                  <input value={p.name} onChange={e=>setSettings(s=>({...s,plates:s.plates.map(x=>x.id===p.id?{...x,name:e.target.value}:x)}))}
                    style={{border:"none",background:"transparent",fontSize:"12px",fontWeight:"700",outline:"none",flex:1}}/>
                  <button onClick={()=>setSettings(s=>({...s,plates:s.plates.filter(x=>x.id!==p.id)}))}
                    style={{background:"none",border:"none",color:ERR,cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>✕</button>
                </div>
                <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                  {[["Max L",p.maxL,v=>({maxL:v}),true],["Max W",p.maxW,v=>({maxW:v}),true],
                    ["Min L",p.minL,v=>({minL:v}),true],["Min W",p.minW,v=>({minW:v}),true],
                    ["Print L",p.printL,v=>({printL:v}),true],
                    ["Print W",p.printW,v=>({printW:v}),true],["Grip",p.grip,v=>({grip:v}),true],
                    ["Imp/1000",p.impRate,v=>({impRate:v}),false]].map(([lbl,val,patch,isSize])=>(
                    <div key={lbl} style={{flex:"1 0 28%",minWidth:0}}>
                      <div style={{fontSize:"8px",color:MT,fontWeight:"600"}}>{lbl}</div>
                      {isSize
                        ?<NumField unit={unit} mm={val} onMM={v=>setSettings(s=>({...s,plates:s.plates.map(x=>x.id===p.id?{...x,...patch(v)}:x)}))}
                          style={{width:"100%",padding:"3px",border:`1px solid ${BD}`,borderRadius:"4px",fontSize:"10px",textAlign:"center",boxSizing:"border-box"}}/>
                        :<FreeNum val={val} onVal={v=>setSettings(s=>({...s,plates:s.plates.map(x=>x.id===p.id?{...x,...patch(v)}:x)}))}
                          style={{width:"100%",padding:"3px",border:`1px solid ${BD}`,borderRadius:"4px",fontSize:"10px",textAlign:"center",boxSizing:"border-box"}}/>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={()=>setSettings(s=>({...s,plates:[...s.plates,{id:Date.now(),name:"New Plate",maxL:500,maxW:350,minL:150,minW:100,printL:480,printW:330,grip:38.1,impRate:750}]}))}
              style={{width:"100%",background:BG,border:`1.5px dashed ${BD}`,borderRadius:"8px",padding:"7px",color:MT,fontWeight:"700",cursor:"pointer",fontSize:"11px"}}>+ Add New Plate</button>
          </div>

          {/* Frequent Sheet Sizes */}
          <div style={{background:CARD,borderRadius:"12px",padding:"9px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"6px"}}>Frequent Sheet Sizes</div>
            {settings.sheetPresets.map((sp,i)=>(
              <div key={i} style={{display:"flex",gap:"4px",alignItems:"center",marginBottom:"4px"}}>
                <span style={{fontSize:"10px",color:MT,flexShrink:0}}>L</span>
                <NumField unit={unit} mm={sp.l} onMM={v=>setSettings(s=>({...s,sheetPresets:s.sheetPresets.map((x,j)=>j===i?{...x,l:v}:x)}))}
                  style={{flex:1,padding:"4px",border:`1px solid ${BD}`,borderRadius:"5px",fontSize:"11px",textAlign:"center"}}/>
                <span style={{fontSize:"10px",color:MT,flexShrink:0}}>W</span>
                <NumField unit={unit} mm={sp.w} onMM={v=>setSettings(s=>({...s,sheetPresets:s.sheetPresets.map((x,j)=>j===i?{...x,w:v}:x)}))}
                  style={{flex:1,padding:"4px",border:`1px solid ${BD}`,borderRadius:"5px",fontSize:"11px",textAlign:"center"}}/>
                <button onClick={()=>setSettings(s=>({...s,sheetPresets:s.sheetPresets.filter((_,j)=>j!==i)}))}
                  style={{background:"none",border:"none",color:ERR,cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>setSettings(s=>({...s,sheetPresets:[...s.sheetPresets,{l:200,w:150}]}))}
              style={{width:"100%",background:BG,border:`1.5px dashed ${BD}`,borderRadius:"8px",padding:"6px",color:MT,fontWeight:"700",cursor:"pointer",fontSize:"11px"}}>+ Add New Sheet Size</button>
          </div>

          {/* Laminating */}
          <div style={{background:CARD,borderRadius:"12px",padding:"9px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"6px"}}>Laminating (Rs/sq.in)</div>
            {settings.laminates.map((l,i)=>(
              <div key={i} style={{display:"flex",gap:"4px",alignItems:"center",marginBottom:"4px"}}>
                <input value={l.name} onChange={e=>setSettings(s=>({...s,laminates:s.laminates.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))}
                  style={{flex:1,padding:"4px 6px",border:`1px solid ${BD}`,borderRadius:"5px",fontSize:"11px"}}/>
                <FreeNum val={l.rate} onVal={v=>setSettings(s=>({...s,laminates:s.laminates.map((x,j)=>j===i?{...x,rate:v}:x)}))}
                  style={{width:"60px",padding:"4px",border:`1px solid ${BD}`,borderRadius:"5px",fontSize:"11px",textAlign:"center"}}/>
                <button onClick={()=>setSettings(s=>({...s,laminates:s.laminates.filter((_,j)=>j!==i)}))}
                  style={{background:"none",border:"none",color:ERR,cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>setSettings(s=>({...s,laminates:[...s.laminates,{name:"New Laminate",rate:0.05}]}))}
              style={{width:"100%",background:BG,border:`1.5px dashed ${BD}`,borderRadius:"8px",padding:"6px",color:MT,fontWeight:"700",cursor:"pointer",fontSize:"11px"}}>+ Add New Laminate</button>
          </div>

          {/* Positive */}
          <div style={{background:CARD,borderRadius:"12px",padding:"9px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"6px"}}>Positive (Rs/sq.in per color)</div>
            <FreeNum val={settings.positiveRate} onVal={v=>setSettings(s=>({...s,positiveRate:v}))}
              style={{width:"100px",padding:"5px",border:`1px solid ${BD}`,borderRadius:"6px",fontSize:"12px",textAlign:"center"}}/>
            <div style={{fontSize:"8px",color:MT,marginTop:"3px"}}>e.g. 4 Color → {(settings.positiveRate*4).toFixed(2)}/sq.in</div>
          </div>

          {/* Die Cutting */}
          <div style={{background:CARD,borderRadius:"12px",padding:"9px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"6px"}}>Die Cutting</div>
            {settings.dieCutters.map(d=>(
              <div key={d.id} style={{display:"flex",gap:"4px",alignItems:"center",marginBottom:"4px"}}>
                <input value={d.name} onChange={e=>setSettings(s=>({...s,dieCutters:s.dieCutters.map(x=>x.id===d.id?{...x,name:e.target.value}:x)}))}
                  style={{flex:1,padding:"4px 6px",border:`1px solid ${BD}`,borderRadius:"5px",fontSize:"11px"}}/>
                <span style={{fontSize:"8px",color:MT}}>Imp/1000</span>
                <FreeNum val={d.impRate} onVal={v=>setSettings(s=>({...s,dieCutters:s.dieCutters.map(x=>x.id===d.id?{...x,impRate:v}:x)}))}
                  style={{width:"50px",padding:"4px",border:`1px solid ${BD}`,borderRadius:"5px",fontSize:"11px",textAlign:"center"}}/>
                <button onClick={()=>setSettings(s=>({...s,dieCutters:s.dieCutters.filter(x=>x.id!==d.id)}))}
                  style={{background:"none",border:"none",color:ERR,cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>setSettings(s=>({...s,dieCutters:[...s.dieCutters,{id:Date.now(),name:"New Machine",impRate:700}]}))}
              style={{width:"100%",background:BG,border:`1.5px dashed ${BD}`,borderRadius:"8px",padding:"6px",color:MT,fontWeight:"700",cursor:"pointer",fontSize:"11px"}}>+ Add New Die Cutter</button>
          </div>

          {/* Rimming */}
          <div style={{background:CARD,borderRadius:"12px",padding:"9px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"6px"}}>Rimming (Rs/sheet)</div>
            <FreeNum val={settings.rimmingRate} onVal={v=>setSettings(s=>({...s,rimmingRate:v}))}
              style={{width:"100px",padding:"5px",border:`1px solid ${BD}`,borderRadius:"6px",fontSize:"12px",textAlign:"center"}}/>
          </div>

          {/* Product */}
          <div style={{background:CARD,borderRadius:"12px",padding:"9px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:T,marginBottom:"6px"}}>Product</div>
            {settings.products.map((prod,i)=>(
              <div key={i} style={{display:"flex",gap:"4px",alignItems:"center",marginBottom:"4px"}}>
                <input value={prod} onChange={e=>setSettings(s=>({...s,products:s.products.map((x,j)=>j===i?e.target.value:x)}))}
                  style={{flex:1,padding:"4px 6px",border:`1px solid ${BD}`,borderRadius:"5px",fontSize:"11px"}}/>
                <button onClick={()=>setSettings(s=>({...s,products:s.products.filter((_,j)=>j!==i)}))}
                  style={{background:"none",border:"none",color:ERR,cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>✕</button>
              </div>
            ))}
            <button onClick={()=>setSettings(s=>({...s,products:[...s.products,"New Product"]}))}
              style={{width:"100%",background:BG,border:`1.5px dashed ${BD}`,borderRadius:"8px",padding:"6px",color:MT,fontWeight:"700",cursor:"pointer",fontSize:"11px"}}>+ Add New Product</button>
          </div>
        </div>}
        {screen==="plan"&&activeTab==="single"&&bk&&<button onClick={()=>setSheetModal(true)}
          style={{position:"absolute",bottom:"25px",left:"25px",width:"48px",height:"48px",
          borderRadius:"50%",background:M,border:"none",color:"#fff",fontSize:"24px",
          fontWeight:"300",cursor:"pointer",boxShadow:"0 4px 12px rgba(212,0,110,0.4)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>+</button>}

        {/* Add sheet modal */}
        {sheetModal&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",
          display:"flex",alignItems:"flex-end",zIndex:20}}>
          <div style={{background:CARD,borderRadius:"16px 16px 0 0",width:"100%",padding:"16px",
            boxSizing:"border-box"}}>
            <div style={{fontSize:"13px",fontWeight:"700",color:T,marginBottom:"12px"}}>
              ➕ Add Booklet Sheet</div>
            {[
              {l:"Page Type",type:"sel",val:newSheet.type,set:v=>setNewSheet({...newSheet,type:v}),
                opts:["Cover Page","Text Pages","Photo Pages","Back Cover"]},
              {l:"Colors",type:"sel",val:newSheet.colors,set:v=>setNewSheet({...newSheet,colors:v}),
                opts:COLS_OPTS},
              {l:"Paper Type",type:"sel",val:newSheet.paper,set:v=>setNewSheet({...newSheet,paper:v}),
                opts:["Art 130gsm","Art 170gsm","Art 250gsm","Art Board 310gsm","Bond 70gsm","Bond 90gsm","Gloss 115gsm"]},
              {l:"No of Pages",type:"num",val:newSheet.pages,set:v=>setNewSheet({...newSheet,pages:Number(v)||1})},
              {l:"Rs/Sheet",type:"num",val:newSheet.rate,set:v=>setNewSheet({...newSheet,rate:Number(v)||0})},
            ].map(f=>(
              <div key={f.l} style={{marginBottom:"8px"}}>
                <div style={{fontSize:"10px",color:MT,fontWeight:"600",marginBottom:"2px"}}>{f.l}</div>
                {f.type==="sel"
                  ?<select value={f.val} onChange={e=>f.set(e.target.value)}
                    style={{width:"100%",padding:"7px",border:`1.5px solid ${BD}`,borderRadius:"8px",
                    fontSize:"12px",outline:"none",background:CARD,boxSizing:"border-box"}}>{
                    f.opts.map(o=><option key={o}>{o}</option>)}</select>
                  :<FreeNum val={f.val} onVal={f.set}
                    style={{width:"100%",padding:"7px",border:`1.5px solid ${BD}`,borderRadius:"8px",
                    fontSize:"12px",outline:"none",boxSizing:"border-box",textAlign:"right",fontWeight:"700"}}/>
                }
              </div>
            ))}
            <div style={{marginBottom:"8px"}}>
              <div style={{fontSize:"10px",color:"#7C3AED",fontWeight:"700",marginBottom:"3px"}}>
                Page Trim Size (on {fs(sheetL)}×{fs(sheetH)} paper)</div>
              <div style={{display:"flex",gap:"6px"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"9px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Width</div>
                  <NumField unit={unit} mm={newSheet.pageW}
                    onMM={v=>setNewSheet({...newSheet,pageW:v})}
                    style={{width:"100%",padding:"7px",border:`1.5px solid #7C3AED`,borderRadius:"8px",
                    fontSize:"12px",outline:"none",boxSizing:"border-box",textAlign:"center",fontWeight:"700",color:"#7C3AED"}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"9px",color:MT,fontWeight:"600",marginBottom:"2px"}}>Height</div>
                  <NumField unit={unit} mm={newSheet.pageH}
                    onMM={v=>setNewSheet({...newSheet,pageH:v})}
                    style={{width:"100%",padding:"7px",border:`1.5px solid #7C3AED`,borderRadius:"8px",
                    fontSize:"12px",outline:"none",boxSizing:"border-box",textAlign:"center",fontWeight:"700",color:"#7C3AED"}}/>
                </div>
              </div>
              {(()=>{const f=fitCalc(sheetL,sheetH,pGrip,eM,eGH,newSheet.pageW,newSheet.pageH);
                return<div style={{fontSize:"10px",color:f.ups>0?SUC:ERR,fontWeight:"700",marginTop:"4px"}}>
                  {f.ups>0?`→ ${f.cols}×${f.rows} = ${f.ups} ups/sheet${f.rot?" (rotated)":""}`:"⚠ Page doesn't fit this paper"}</div>;
              })()}
            </div>
            <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
              <button onClick={()=>setSheetModal(false)}
                style={{flex:1,padding:"11px",background:BG,border:"none",borderRadius:"9px",
                color:MT,fontWeight:"700",cursor:"pointer",fontSize:"13px"}}>Cancel</button>
              <button onClick={addBookletSheet}
                style={{flex:2,padding:"11px",background:M,border:"none",borderRadius:"9px",
                color:"#fff",fontWeight:"700",cursor:"pointer",fontSize:"13px"}}>Add Sheet Plan</button>
            </div>
          </div>
        </div>}

        {saved&&<div style={{position:"absolute",top:"38px",left:"50%",transform:"translateX(-50%)",
          background:SUC,color:"#fff",borderRadius:"10px",padding:"8px 16px",
          fontSize:"12px",fontWeight:"700",zIndex:99,whiteSpace:"nowrap"}}>
          ✓ Applied to quotation!</div>}
      </div>
    </div>
  );
}
