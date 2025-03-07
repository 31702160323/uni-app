import path from 'path'
import fs from 'fs-extra'
import {
  type UniVitePlugin,
  buildUniExtApis,
  camelize,
  formatExtApiProviderName,
  getCurrentCompiledUTSPlugins,
  getUniExtApiProviderRegisters,
  isNormalCompileTarget,
  parseManifestJsonOnce,
  parseUniExtApi,
  resolveUTSCompiler,
} from '@dcloudio/uni-cli-shared'
import type { OutputChunk } from 'rollup'
import StandaloneExtApis from './standalone-ext-apis.json'

const commondGlobals: Record<string, string> = {
  vue: 'Vue',
  '@vue/shared': 'uni.VueShared',
}

const harmonyGlobals: (string | RegExp)[] = [
  /^@ohos\./,
  /^@kit\./,
  /^@hms\./,
  /^@arkts\./,
  /^@system\./,
  '@ohos/hypium',
  '@ohos/hamock',
]

function isHarmoneyGlobal(id: string) {
  return harmonyGlobals.some((harmonyGlobal) =>
    typeof harmonyGlobal === 'string'
      ? harmonyGlobal === id
      : harmonyGlobal.test(id)
  )
}

function generateHarmonyImportSpecifier(id: string) {
  return id.replace(/([@\/\.])/g, function (_, $1) {
    switch ($1) {
      case '.':
        return '_'
      case '/':
        return '__'
      default:
        return ''
    }
  })
}

function generateHarmonyImportExternalCode(hamonyPackageNames: string[]) {
  return hamonyPackageNames
    .filter((hamonyPackageName) => isHarmoneyGlobal(hamonyPackageName))
    .map(
      (hamonyPackageName) =>
        `import ${generateHarmonyImportSpecifier(
          hamonyPackageName
        )} from '${hamonyPackageName}';`
    )
    .join('')
}

export function uniAppHarmonyPlugin(): UniVitePlugin {
  return {
    name: 'uni:app-harmony',
    apply: 'build',
    config() {
      return {
        build: {
          rollupOptions: {
            external: [...Object.keys(commondGlobals), ...harmonyGlobals],
            output: {
              globals: function (id: string) {
                return (
                  commondGlobals[id] ||
                  (isHarmoneyGlobal(id)
                    ? generateHarmonyImportSpecifier(id)
                    : '')
                )
              },
            },
          },
        },
      }
    },
    async generateBundle(_, bundle) {
      genAppHarmonyUniModules(
        process.env.UNI_INPUT_DIR,
        getCurrentCompiledUTSPlugins()
      )
      for (const key in bundle) {
        const serviceBundle = bundle[key] as OutputChunk
        if (serviceBundle.code) {
          serviceBundle.code =
            generateHarmonyImportExternalCode(serviceBundle.imports) +
            serviceBundle.code
        }
      }
    },
    async writeBundle() {
      if (!isNormalCompileTarget()) {
        return
      }
      // x 上暂时编译所有uni ext api，不管代码里是否调用了
      await buildUniExtApis()
    },
  }
}

/**
 * extapi分为如下几种
 * 1. 内部extapi，编译到uni.api.ets内
 * 2. 内部provider，编译到uni.api.ets内。目前不存在这种场景，所有provider都是单独的ohpm包
 * 3. 内部extapi，发布到ohpm
 * 4. 内部provider，发布到ohpm
 * 5. 用户自定义extapi
 * 6. 用户自定义provider
 */

interface IRelatedProvider {
  service: string
  name: string
}

// 仅存放重命名的provider service
const SupportedProviderService = {
  oauth: {},
  payment: {
    weixin: 'wxpay',
  },
}

/**
 * 获取manifest.json中勾选的provider
 */
function getRelatedProviders(inputDir: string): IRelatedProvider[] {
  const manifest = parseManifestJsonOnce(inputDir)
  const providers: IRelatedProvider[] = []
  const sdkConfigs = manifest?.['app-plus']?.distribute?.sdkConfigs
  if (!sdkConfigs) {
    return providers
  }
  for (const service in sdkConfigs) {
    if (Object.prototype.hasOwnProperty.call(sdkConfigs, service)) {
      const ProviderNameMap = SupportedProviderService[service]
      if (!ProviderNameMap) {
        continue
      }
      const relatedProviders = sdkConfigs[service]
      for (const name in relatedProviders) {
        if (Object.prototype.hasOwnProperty.call(relatedProviders, name)) {
          const providerName = ProviderNameMap[name]
          providers.push({
            service,
            name: providerName || name,
          })
        }
      }
    }
  }
  return providers
}

const SupportedModules = {
  FacialRecognitionVerify: 'uni-facialRecognitionVerify',
}

// 获取uni_modules中的相关模块
function getRelatedModules(inputDir: string): string[] {
  const manifest = parseManifestJsonOnce(inputDir)
  const modules: string[] = []
  const manifestModules = manifest?.['app-plus']?.modules
  if (!manifestModules) {
    return modules
  }
  for (const manifestModule in manifestModules) {
    if (Object.prototype.hasOwnProperty.call(manifestModules, manifestModule)) {
      const moduleName = SupportedModules[manifestModule]
      if (!moduleName) {
        continue
      }
      modules.push(moduleName)
    }
  }
  return modules
}

function genAppHarmonyUniModules(inputDir: string, utsPlugins: Set<string>) {
  const uniModulesDir = path.resolve(inputDir, 'uni_modules')
  const importCodes: string[] = []
  const extApiCodes: string[] = []
  const registerCodes: string[] = []
  utsPlugins.forEach((plugin) => {
    const injects = parseUniExtApi(
      path.resolve(uniModulesDir, plugin),
      plugin,
      true,
      'app-harmony',
      'arkts'
    )
    const hamonyPackageName = `@uni_modules/${plugin.toLowerCase()}`
    if (injects) {
      Object.keys(injects).forEach((key) => {
        const inject = injects[key]
        if (Array.isArray(inject) && inject.length > 1) {
          const apiName = inject[1]
          importCodes.push(
            `import { ${inject[1]} } from '${hamonyPackageName}'`
          )
          extApiCodes.push(`uni.${apiName} = ${apiName}`)
        }
      })
    } else {
      const ident = camelize(plugin)
      importCodes.push(`import * as ${ident} from '${hamonyPackageName}'`)
      registerCodes.push(
        `uni.registerUTSPlugin('uni_modules/${plugin}', ${ident})`
      )
    }
  })

  const relatedProviders = getRelatedProviders(inputDir)
  const relatedModules = getRelatedModules(inputDir)

  const projectDeps: {
    moduleSpecifier: string
    plugin: string
    source: 'local' | 'ohpm'
    version?: string
  }[] = []

  relatedModules.forEach((module) => {
    const harmonyModuleName = `@uni_modules/${module.toLowerCase()}`
    if (utsPlugins.has(module)) {
      projectDeps.push({
        moduleSpecifier: harmonyModuleName,
        plugin: module,
        source: 'local',
      })
    } else {
      const matchedStandaloneExtApi = StandaloneExtApis.find(
        (item) => item.plugin === module
      )
      if (matchedStandaloneExtApi) {
        projectDeps.push({
          moduleSpecifier: harmonyModuleName,
          plugin: module,
          source: 'ohpm',
          version: matchedStandaloneExtApi.version,
        })
      }
    }
    importCodes.push(`import '${harmonyModuleName}'`)
  })

  const importProviderCodes: string[] = []
  const registerProviderCodes: string[] = []
  const providers = getUniExtApiProviderRegisters()
  const allProviders = providers.map((provider) => {
    return {
      service: provider.service,
      name: provider.name,
      moduleSpecifier: `@uni_modules/${provider.plugin.toLowerCase()}`,
      plugin: provider.plugin,
      source: 'local',
      version: undefined as undefined | string,
    }
  })

  StandaloneExtApis.filter((item) => {
    return item.type === 'provider'
  }).forEach((extapi) => {
    if (allProviders.find((item) => item.plugin === extapi.plugin)) {
      return
    }
    const [_, service, provider] = extapi.plugin.split('-')
    allProviders.push({
      service,
      name: provider,
      moduleSpecifier: `@uni_modules/${extapi.plugin.toLowerCase()}`,
      plugin: extapi.plugin,
      source: 'ohpm',
      version: extapi.version,
    })
  })

  relatedProviders.forEach((relatedProvider) => {
    const provider = allProviders.find(
      (item) =>
        item.service === relatedProvider.service &&
        item.name === relatedProvider.name
    )
    if (!provider) {
      return
    }
    projectDeps.push({
      moduleSpecifier: provider.moduleSpecifier,
      plugin: provider.plugin,
      source: provider.source as 'local' | 'ohpm',
    })
    const className = formatExtApiProviderName(provider.service, provider.name)
    importProviderCodes.push(
      `import { ${className} } from '${provider.moduleSpecifier}'`
    )
    registerProviderCodes.push(
      `registerUniProvider('${provider.service}', '${provider.name}', new ${className}())`
    )
  })
  if (importProviderCodes.length) {
    importProviderCodes.unshift(
      `import { registerUniProvider, uni } from '@dcloudio/uni-app-runtime'`
    )
    importCodes.push(...importProviderCodes)
    extApiCodes.push(...registerProviderCodes)
  }

  const uniModuleEntryDir =
    resolveUTSCompiler().resolveAppHarmonyUniModulesEntryDir()
  fs.outputFileSync(
    path.resolve(uniModuleEntryDir, 'index.generated.ets'),
    `// This file is automatically generated by uni-app.
// Do not modify this file -- YOUR CHANGES WILL BE ERASED!
${importCodes.join('\n')}

export function initUniModules() {
  initUniExtApi()
  ${registerCodes.join('\n  ')}
}

function initUniExtApi() {
  ${extApiCodes.join('\n  ')}
}
`
  )

  const dependencies: Record<string, string> = {}
  const modules: { name: string; srcPath: string }[] = []
  projectDeps.forEach((dep) => {
    // TODO 依赖版本绑定编译器版本
    if (dep.source === 'local') {
      const depPath = './uni_modules/' + dep.plugin
      dependencies[dep.moduleSpecifier] = depPath
      modules.push({
        name: dep.moduleSpecifier
          .replace(/@/g, '')
          .replace(/\//g, '__')
          .replace(/-/g, '_'),
        srcPath: depPath,
      })
    } else {
      dependencies[dep.moduleSpecifier] = '*'
    }
  })
  // TODO 写入到用户项目的oh-package.json5、build-profile.json5内
  fs.outputJSONSync(
    path.resolve(uniModuleEntryDir, 'oh-package.json5'),
    { dependencies },
    { spaces: 2 }
  )
  fs.outputJSONSync(
    path.resolve(uniModuleEntryDir, 'build-profile.json5'),
    { modules },
    { spaces: 2 }
  )
}
