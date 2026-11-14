import {useState} from 'react'
export type Mode='auto'|'light'|'dark'
export const getMode=():Mode=>{try{return (localStorage.getItem('mode') as Mode)||'auto'}catch{return 'auto'}}
export function applyMode(m:Mode){
  try{localStorage.setItem('mode',m)}catch{}
  const dark=m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark',dark)
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',dark?'#0b0b0d':'#f3f2ee')}
export function ThemePicker(){
  const [m,setM]=useState<Mode>(getMode())
  return <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
    <div className="font-medium">tampilan</div>
    <div className="grid grid-cols-3 gap-2">{([['auto','otomatis'],['light','terang'],['dark','gelap']] as const).map(([v,l])=>
      <button key={v} onClick={()=>{applyMode(v);setM(v)}} className={'rounded-xl p-3 border '+(m===v?'bg-blue-600 text-white border-blue-600':'border-zinc-300 dark:border-zinc-700')}>{l}</button>)}</div></div>}
