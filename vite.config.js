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
    port: 5173,
    open: true,
    proxy: {
      '/v3': {
        target: 'https://myhostex-proxy.onrender.com',
        changeOrigin: true,
        secure: true,
        // 这里做清洗：把开头和结尾所有的斜杠都去掉，然后拼接一个标准路径
        rewrite: (path) => {
          // 去掉开头的 /v3 和多余的斜杠，比如 v3//properties 变成 properties
          const cleanPath = path.replace(/^\/?v3\/+/, '');
          // 拼接成 Render 后台需要的标准格式：/hostex/v3/properties
          return `/hostex/v3/${cleanPath}`;
        },
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
