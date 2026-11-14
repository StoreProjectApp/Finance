import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import {VitePWA} from 'vite-plugin-pwa'
export default defineConfig({plugins:[react(),tailwind(),VitePWA({registerType:'autoUpdate',manifest:{name:'keuangan keluarga',short_name:'keuangan',lang:'id',display:'standalone',background_color:'#ffffff',theme_color:'#2563eb',icons:[{src:'icon.svg',sizes:'any',type:'image/svg+xml'}]}})]})
