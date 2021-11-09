import path from 'path'
import {
  initProvide,
  uniViteInjectPlugin,
  uniCssScopedPlugin,
  getAppStyleIsolation,
  parseManifestJsonOnce,
  uniConsolePlugin,
  UNI_EASYCOM_EXCLUDE,
} from '@dcloudio/uni-cli-shared'
import { plugins as nvuePlugins } from '@dcloudio/uni-cli-nvue'
import { UniAppPlugin } from './plugin'
import { uniTemplatePlugin } from './plugins/template'
import { uniMainJsPlugin } from './plugins/mainJs'
import { uniManifestJsonPlugin } from './plugins/manifestJson'
import { uniPagesJsonPlugin } from './plugins/pagesJson'
// import { uniResolveIdPlugin } from './plugins/resolveId'
import { uniRenderjsPlugin } from './plugins/renderjs'
import { uniStatsPlugin } from './plugins/stats'
import { uniEasycomPlugin } from './plugins/easycom'

function initUniCssScopedPluginOptions() {
  const styleIsolation = getAppStyleIsolation(
    parseManifestJsonOnce(process.env.UNI_INPUT_DIR)
  )
  if (styleIsolation === 'shared') {
    return
  }
  if (styleIsolation === 'isolated') {
    // isolated: 对所有非 App.vue 增加 scoped
    return {}
  }
  // apply-shared: 仅对非页面组件增加 scoped
  return { exclude: /mpType=page/ }
}

const plugins = [
  uniEasycomPlugin({ exclude: UNI_EASYCOM_EXCLUDE }),
  // uniResolveIdPlugin(),
  uniConsolePlugin({
    filename(filename) {
      filename = path.relative(process.env.UNI_INPUT_DIR, filename)
      if (filename.startsWith('.') || path.isAbsolute(filename)) {
        return ''
      }
      return filename
    },
  }),
  uniMainJsPlugin(),
  uniManifestJsonPlugin(),
  uniPagesJsonPlugin(),
  uniViteInjectPlugin(initProvide()),
  uniRenderjsPlugin(),
  uniTemplatePlugin(),
  uniStatsPlugin(),
  UniAppPlugin,
]

const uniCssScopedPluginOptions = initUniCssScopedPluginOptions()
if (uniCssScopedPluginOptions) {
  plugins.unshift(uniCssScopedPlugin(uniCssScopedPluginOptions))
}
if (process.env.UNI_NVUE_COMPILER !== 'vue') {
  plugins.push(...nvuePlugins)
}
export default plugins
