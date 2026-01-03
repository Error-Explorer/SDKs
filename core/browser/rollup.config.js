import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const production = !process.env.ROLLUP_WATCH;

// Banner for all builds
const banner = `/**
 * @error-explorer/browser v1.0.0
 * Error Explorer SDK for Browser
 * https://github.com/error-explorer/error-explorer-sdks
 * (c) ${new Date().getFullYear()} Error Explorer
 * Released under the MIT License
 */`;

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/error-explorer.esm.js',
      format: 'esm',
      sourcemap: true,
      banner,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },

  // CJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/error-explorer.cjs.js',
      format: 'cjs',
      sourcemap: true,
      banner,
      exports: 'named',
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },

  // IIFE build (minified, for CDN/browser)
  {
    input: 'src/browser.ts',
    output: {
      file: 'dist/error-explorer.min.js',
      format: 'iife',
      name: 'ErrorExplorer',
      sourcemap: true,
      banner,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
      production && terser({
        format: {
          comments: /^!/,
        },
      }),
    ],
  },

  // TypeScript declarations
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
];
