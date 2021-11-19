/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const rollup = require('rollup');
const rollupPlugins = require('./rollup-plugins.js');
const fs = require('fs');
const {LH_ROOT} = require('../root.js');
const {getIcuMessageIdParts} = require('../shared/localization/format.js');

/**
 * Extract only the strings needed for the flow report into
 * a script that sets a global variable `strings`, whose keys
 * are locale codes (en-US, es, etc.) and values are localized UIStrings.
 */
function buildFlowStrings() {
  const locales = require('../shared/localization/locales.js');
  // TODO(esmodules): use dynamic import when build/ is esm.
  const i18nCode = fs.readFileSync(`${LH_ROOT}/flow-report/src/i18n/ui-strings.js`, 'utf-8');
  const UIStrings = eval(i18nCode.replace(/export /g, '') + '\nmodule.exports = UIStrings;');
  const strings = /** @type {Record<LH.Locale, string>} */ ({});

  for (const [locale, lhlMessages] of Object.entries(locales)) {
    const localizedStrings = Object.fromEntries(
      Object.entries(lhlMessages).map(([icuMessageId, v]) => {
        const {filename, key} = getIcuMessageIdParts(icuMessageId);
        if (!filename.endsWith('ui-strings.js') || !(key in UIStrings)) {
          return [];
        }

        return [key, v.message];
      })
    );
    strings[/** @type {LH.Locale} */ (locale)] = localizedStrings;
  }

  return 'export default ' + JSON.stringify(strings, null, 2) + ';';
}

async function buildStandaloneReport() {
  const bundle = await rollup.rollup({
    input: 'report/clients/standalone.js',
    plugins: [
      rollupPlugins.commonjs(),
      rollupPlugins.terser(),
    ],
  });

  await bundle.write({
    file: 'dist/report/standalone.js',
    format: 'iife',
  });
  await bundle.close();
}

async function buildFlowReport() {
  const bundle = await rollup.rollup({
    input: 'flow-report/standalone-flow.tsx',
    plugins: [
      rollupPlugins.inlineFs({verbose: true}),
      rollupPlugins.replace({
        '__dirname': '""',
      }),
      rollupPlugins.shim({
        [`${LH_ROOT}/flow-report/src/i18n/localized-strings`]: buildFlowStrings(),
        [`${LH_ROOT}/shared/localization/locales.js`]: 'export default {}',
        'fs': 'export default {}',
      }),
      rollupPlugins.nodeResolve(),
      rollupPlugins.commonjs(),
      rollupPlugins.typescript({
        tsconfig: 'flow-report/tsconfig.json',
        // Plugin struggles with custom outDir, so revert it from tsconfig value
        // as well as any options that require an outDir is set.
        outDir: null,
        composite: false,
        emitDeclarationOnly: false,
        declarationMap: false,
      }),
      rollupPlugins.terser(),
    ],
  });

  await bundle.write({
    file: 'dist/report/flow.js',
    format: 'iife',
  });
  await bundle.close();
}

async function buildEsModulesBundle() {
  const bundle = await rollup.rollup({
    input: 'report/clients/bundle.js',
    plugins: [
      rollupPlugins.commonjs(),
      rollupPlugins.inlineFs({verbose: true}),
    ],
  });

  await bundle.write({
    file: 'dist/report/bundle.esm.js',
    format: 'esm',
  });
  await bundle.close();
}

async function buildUmdBundle() {
  const bundle = await rollup.rollup({
    input: 'report/clients/bundle.js',
    plugins: [
      rollupPlugins.commonjs(),
      rollupPlugins.terser({
        format: {
          beautify: true,
        },
      }),
    ],
  });

  await bundle.write({
    file: 'dist/report/bundle.umd.js',
    format: 'umd',
    name: 'report',
  });
  await bundle.close();
}

async function main() {
  if (process.argv.length <= 2) {
    await Promise.all([
      buildStandaloneReport(),
      buildFlowReport(),
      buildEsModulesBundle(),
      buildUmdBundle(),
    ]);
  }

  if (process.argv.includes('--psi')) {
    console.error('--psi build removed. use --umd instead.');
    process.exit(1);
  }
  if (process.argv.includes('--standalone')) {
    await buildStandaloneReport();
  }
  if (process.argv.includes('--flow')) {
    await buildFlowReport();
  }
  if (process.argv.includes('--esm')) {
    await buildEsModulesBundle();
  }
  if (process.argv.includes('--umd')) {
    await buildUmdBundle();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildStandaloneReport,
  buildFlowReport,
  buildUmdBundle,
};
