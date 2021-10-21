import { isNativeTag, isCustomElement } from '@dcloudio/uni-shared'
import { EmittedFile } from 'rollup'
import { CopyOptions, UniVitePlugin } from '@dcloudio/uni-cli-shared'
import { TemplateCompiler } from '@vue/compiler-sfc'

import * as compiler from '@dcloudio/uni-mp-compiler'

export function uniOptions({
  copyOptions,
  miniProgram,
}: {
  copyOptions: CopyOptions
  miniProgram: {
    slot: {
      fallback: boolean
    }
    filter?: {
      lang: string
    }
    directive: string
    emitFile?: (emittedFile: EmittedFile) => string
  }
}): UniVitePlugin['uni'] {
  return {
    copyOptions,
    compiler: compiler as TemplateCompiler,
    compilerOptions: {
      miniProgram,
      isNativeTag,
      isCustomElement,
    },
  }
}
