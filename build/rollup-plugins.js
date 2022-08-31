/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {nodeResolve} from '@rollup/plugin-node-resolve';
import postprocess from '@stadtlandnetz/rollup-plugin-postprocess';
import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import replace from 'rollup-plugin-replace';
// @ts-expect-error: no published types.
import shim from 'rollup-plugin-shim';
import {terser} from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

import inlineFs from './plugins/rollup-plugin-inline-fs.js';

/**
 * These expressions should never show up in a bundle, otherwise they'll never
 * run inside a browser. They are only ever used to set a variable `moduleDir`,
 * which the inline-fs replaces anyways.
 */
function removeModuleDirCalls() {
  return replace({
    delimiters: ['', ''],
    values: {
      'getModuleDirectory(import.meta)': '""',
    },
  });
}

export {
  alias,
  commonjs,
  inlineFs,
  json,
  nodePolyfills,
  nodeResolve,
  postprocess,
  removeModuleDirCalls,
  replace,
  shim,
  terser,
  typescript,
};
