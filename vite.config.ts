import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'electron-file-protocol',
      transformIndexHtml(html) {
        // file:// 下带 crossorigin 的模块脚本会被 CORS 拦掉，页面变空白
        return html.replace(/\s+crossorigin(="[^"]*")?/g, '')
      }
    }
  ],
  root: 'src/renderer',
  base: './',
  resolve: {
    // 页面用的是 Options API 字符串 template，必须带编译器；
    // 默认 runtime-only 构建会渲染出空白页。
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        settings: 'src/renderer/index.html',
        break: 'src/renderer/break.html'
      }
    }
  }
})
