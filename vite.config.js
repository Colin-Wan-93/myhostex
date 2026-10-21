import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/myhostex/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173, // 可选，开发端口
    open: true, // 可选，自动打开浏览器
    proxy: {
      '/v3': {
        target: 'https://api.myhostex.com',
        changeOrigin: true, // 注意拼写：changeOrigin，不是 changeOrigin 的变体
        secure: true, // target 是 https 时设为 true
      },
    },
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: [
        'vue',// 自动导入vue
        'vue-router',// 自动导入vue-router
        'pinia',// 自动导入pinia
      ],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
})
