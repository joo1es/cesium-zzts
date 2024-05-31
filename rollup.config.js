import { terser } from 'rollup-plugin-terser'
import resolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss';
import image from '@rollup/plugin-image';

const output = (file, plugins) => ({
    input: 'src/index.ts',
    external: ['cesium'],
    output: {
        globals: { 'cesium': 'Cesium' },
        name: 'CesiumZZTS',
        format: 'umd',
        indent: false,
        file
    },
    plugins
});

export default [
    output('dist/index.js', [image(), postcss({
        extensions: ['.css']
    }), resolve(), commonjs(), typescript({ tsconfig: './tsconfig.json', declaration: true }), peerDepsExternal()]),
    output('dist/index.min.js', [image(), postcss({
        extensions: ['.css']
    }), resolve(), commonjs(), typescript({ tsconfig: './tsconfig.json', declaration: true }), peerDepsExternal(), terser()])
];