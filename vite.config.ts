import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
 plugins:[react()],
 base:process.env.GITHUB_PAGES==='true'?'/chessy/':'/',
 resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},
 server:{host:'127.0.0.1',port:5173},
 build:{sourcemap:false,rollupOptions:{output:{manualChunks(id){
  if(/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'react-vendor';
  if(/node_modules\/(chess.js|react-chessboard)\//.test(id))return 'chess-vendor';
 }}}},
});
