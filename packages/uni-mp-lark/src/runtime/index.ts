import { EventChannel } from '@dcloudio/uni-shared'
import {
  initCreateApp,
  initCreatePage,
  initCreateComponent,
} from '@dcloudio/uni-mp-core'

import '@dcloudio/uni-mp-polyfill'

import * as parsePageOptions from '@dcloudio/uni-mp-toutiao/src/runtime/parsePageOptions'
import * as parseComponentOptions from '@dcloudio/uni-mp-toutiao/src/runtime/parseComponentOptions'

export const createApp = initCreateApp()
export const createPage = initCreatePage(parsePageOptions)
export const createComponent = initCreateComponent(parseComponentOptions)
;(tt as any).EventChannel = EventChannel
;(tt as any).createApp = (global as any).createApp = createApp
;(tt as any).createPage = createPage
;(tt as any).createComponent = createComponent
