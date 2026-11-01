import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', {recursive:true});
await build({entryPoints:['src/app.js'],bundle:true,outfile:'dist/app.js',format:'iife',target:['safari15','chrome100'],minify:true});
await Promise.all(['index.html','style.css'].map(f=>copyFile(f,`dist/${f}`)));
