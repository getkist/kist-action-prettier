import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: {
            'index': 'src/index.ts'
        },
        format: ['esm', 'cjs'],
        outExtension: ({ format }) => ({
            js: format === 'esm' ? '.mjs' : '.cjs'
        }),
        dts: true,
        outDir: 'dist',
        target: 'esnext',
        splitting: false,
        sourcemap: true,
        clean: true,
        minify: false,
        treeshake: true,
        external: ['kist'],
    },
]);
