import {useState} from 'react'
export type Mode='auto'|'light'|'dark'
export const getMode=():Mode=>{try{return (localStorage.getItem('mode') as Mode)||'auto'}catch{return 'auto'}}
export function applyMode(m:Mode){
  try{localStorage.setItem('mode',m)}catch{}
  const dark=m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark',dark)
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',dark?'#0a0f1a':'#f0f4f8')}
export function ThemePicker(){
  const [m,setM]=useState<Mode>(getMode())
  return <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
    <div className="font-medium">tampilan</div>
    <div className="grid grid-cols-3 gap-2">{([['auto','otomatis'],['light','terang'],['dark','gelap']] as const).map(([v,l])=>
      <button key={v} onClick={()=>{applyMode(v);setM(v)}} className={'rounded-xl p-3 border '+(m===v?'bg-brand-600 text-white border-brand-600':'border-zinc-300 dark:border-zinc-700')}>{l}</button>)}</div></div>}

export type Field={label:string,type?:string,placeholder?:string,value?:string,options?:[string,string][],onChange?:(v:string)=>void}
export function Modal({title,fields=[],onSubmit,onClose,danger,text}:{title:string,fields?:Field[],onSubmit:(v:string[])=>any,onClose:()=>void,danger?:boolean,text?:string}){
  const [v,setV]=useState<string[]>(fields.map(f=>f.value??'')),[busy,setBusy]=useState(false)
  const set=(i:number,x:string,f:Field)=>{const n=[...v];n[i]=f.type==='number'?x.replace(/\D/g,''):x;setV(n);f.onChange?.(n[i])}
  const go=async()=>{if(busy)return;setBusy(true);try{const ok=await onSubmit(v);if(ok!==false)onClose()}finally{setBusy(false)}}
  const cls='w-full rounded-xl border border-slate-300/70 dark:border-zinc-700 bg-white/70 dark:bg-transparent p-3'
  return <div className="fixed inset-0 z-30 flex items-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full rounded-t-3xl bg-white dark:bg-[#111827] p-5 pb-8 space-y-3 animate-slideUp" onClick={e=>e.stopPropagation()}>
      <div className="mx-auto h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700"/>
      <h2 className="text-lg font-semibold">{title}</h2>
      {text&&<p className="text-sm text-zinc-500">{text}</p>}
      {fields.map((f,i)=><label key={i} className="block space-y-1"><span className="text-xs text-zinc-500">{f.label}</span>
        {f.type==='select'?<select className={cls} value={v[i]} onChange={e=>set(i,e.target.value,f)}>{f.options?.map(([o,l])=><option key={o} value={o}>{l}</option>)}</select>
          :<input autoFocus={i===0} className={cls} type={f.type==='date'?'date':'text'} inputMode={f.type==='number'?'numeric':undefined} placeholder={f.placeholder} value={v[i]} onChange={e=>set(i,e.target.value,f)}/>}</label>)}
      <button disabled={busy} className={'w-full rounded-xl text-white p-3 font-semibold active:scale-[.98] transition disabled:opacity-50 '+(danger?'bg-expense':'btn-grad')} onClick={go}>{danger?'hapus':'simpan'}</button>
      <button className="w-full p-2 text-zinc-500" onClick={onClose}>batal</button>
    </div></div>}

export type Prefs={jenis:'all'|'income'|'expense',ikon:'emoji'|'inisial'}
export const getPrefs=():Prefs=>{try{return {jenis:'all',ikon:'emoji',...JSON.parse(localStorage.getItem('prefs')||'{}')}}catch{return {jenis:'all',ikon:'emoji'}}}
export const savePrefs=(p:Prefs)=>{try{localStorage.setItem('prefs',JSON.stringify(p))}catch{}}
export function PrefsPicker({value,onChange}:{value:Prefs,onChange:(p:Prefs)=>void}){
  const Seg=({k,opts}:{k:keyof Prefs,opts:string[][]})=><div className="flex gap-2">{opts.map(([v,l])=><button key={v} onClick={()=>{const p={...value,[k]:v} as Prefs;savePrefs(p);onChange(p)}} className={'flex-1 rounded-xl p-3 border text-sm '+(value[k]===v?'bg-brand-600 text-white border-brand-600':'border-slate-300/70 dark:border-zinc-700')}>{l}</button>)}</div>
  return <div className="rounded-2xl bg-white dark:bg-[#111827] ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-4 space-y-3">
    <div className="font-medium">tampilan transaksi</div>
    <div className="text-xs text-zinc-500">jenis yang ditampilkan di riwayat</div><Seg k="jenis" opts={[['all','semua'],['income','pemasukan'],['expense','pengeluaran']]}/>
    <div className="text-xs text-zinc-500">ikon kategori</div><Seg k="ikon" opts={[['emoji','emoji'],['inisial','huruf awal']]}/></div>}
