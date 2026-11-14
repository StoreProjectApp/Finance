import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import {applyMode,getMode} from './theme'
applyMode(getMode())
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>applyMode(getMode()))
createRoot(document.getElementById('root')!).render(<App/>)
