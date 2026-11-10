import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                external: ['uiohook-napi'],
            },
        },
    },
    preload: {},
    renderer: {
        resolve: {
            alias: {
                '@renderer': resolve('src/renderer/src'),
            },
        },
        plugins: [react()],
    },
})