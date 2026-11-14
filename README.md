# keuangan keluarga
  
## A. coba di komputer (opsional)
1. pasang Node.js versi LTS dari nodejs.org
2. salin `.env.example` menjadi `.env`, isi dua nilainya dari Supabase (Project Settings > API): Project URL dan anon public key. jangan pakai service_role
3. buka terminal di folder ini: `npm install` lalu `npm run dev`

## B. unggah ke GitHub
1. github.com > New repository > pilih Private > Create
2. klik "uploading an existing file", seret semua isi folder ini (file `.env` jangan ikut), lalu Commit

## C. pasang di Cloudflare Pages
1. dash.cloudflare.com > Workers & Pages > Create > Pages > Connect to Git, pilih repositori tadi
2. Build command: `npm run build`, Build output directory: `dist`
3. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `NODE_VERSION` = `20`
4. Save and Deploy. tunggu sampai muncul alamat `xxxx.pages.dev`
5. di Supabase > Authentication > URL Configuration, isi Site URL dengan alamat itu

## D. pakai
- buka alamat di HP, daftar, buat keluarga. istri daftar lalu gabung dengan kode undangan di beranda
- pasang di layar utama: menu browser > Tambahkan ke layar utama
- setelah berdua terdaftar, matikan "Allow new users to sign up" di Supabase

## E. disiapkan untuk nanti
kolom `receipt_path`, bucket `receipts`, dan folder `supabase/functions`.
