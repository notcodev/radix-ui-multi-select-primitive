import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  minify: true,
  target: 'esnext',
  outDir: 'dist',
  treeshake: true,
})
