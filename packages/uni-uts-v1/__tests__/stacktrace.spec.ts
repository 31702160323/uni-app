import path from 'path'
import {
  parseUTSKotlinStacktrace,
  parseUTSSwiftPluginStacktrace,
  parseUTSSyntaxError,
} from '../src/stacktrace'
import { hbuilderFormatter } from '../src/stacktrace/kotlin'
const stacktrace = `/uts-development-ios/dependences/buildFramework/template/xcode_ust_template/unimoduleTestUTS1/src/index.swift:3:12: error: cannot convert return expression of type 'Int' to return type 'String'
/uts-development-ios/dependences/buildFramework/template/xcode_ust_template/unimoduleTestUTS1/src/index.swift:6:12: error: cannot convert return expression of type 'Int' to return type 'String'
`

describe('uts:stacktrace', () => {
  test('parseUTSSwiftPluginStacktrace', async () => {
    const codes = await parseUTSSwiftPluginStacktrace({
      stacktrace,
      sourceMapFile: path.resolve(
        __dirname,
        './examples/sourcemap/index.swift.map'
      ),
      sourceRoot: '/Users/xxx/DCloud/test-uts',
    })
    expect(codes).toContain(
      `uni_modules/test-uts1/utssdk/app-ios/index.uts:2:10`
    )
    expect(codes).toContain(
      `uni_modules/test-uts1/utssdk/app-ios/index.uts:5:10`
    )
  })
  test('parseUTSSyntaxError', () => {
    const msg = parseUTSSyntaxError(
      `Error: 
x UTSCallback 已过时，详情查看 https://uniapp.dcloud.net.cn/plugin/uts-plugin.html#%E5%B8%B8%E8%A7%81%E6%8A%A5%E9%94%99.
    ,-[uni_modules/uts-alert/utssdk/app-android/index.uts:29:1]
29 | 	inputET:EditText
30 | 	callback:UTSCallback
    :           ^^^^^^^^^^^
31 |
Error: 
x UTSCallback 已过时，详情查看 https://uniapp.dcloud.net.cn/plugin/uts-plugin.html#%E5%B8%B8%E8%A7%81%E6%8A%A5%E9%94%99.
    ,-[uni_modules/uts-alert/utssdk/app-android/index.uts:29:1]
29 | 	inputET:EditText
30 | 	callback:UTSCallback
    :           ^^^^^^^^^^^
31 |`,
      ``
    )
    expect(msg.match(/at\s/g)?.length).toBe(2)
  })
  test('parseUTSKotlinStacktrace', async () => {
    const inputDir = `/Users/xxx/HBuilderProjects/test-x/unpackage/dist/dev/.kotlin/src`
    const sourceMapDir = path.resolve(
      __dirname,
      'examples/uts/unpackage/dist/dev/.sourcemap/app'
    )
    expect(
      await parseUTSKotlinStacktrace(
        [
          {
            type: 'warning',
            message:
              'Classpath entry points to a non-existent location: /Users/xxx/HBuilderProjects/test-x/unpackage/dist/dev/.kotlin/class',
          },
          {
            type: 'error',
            message: 'Unresolved reference: test',
            file: `${inputDir}/components/test/test.kt`,
            line: 33,
            column: 21,
          },
        ],
        {
          inputDir,
          sourceMapDir,
          replaceTabsWithSpace: true,
          format: hbuilderFormatter,
        }
      )
    ).toMatchSnapshot()
    expect(
      await parseUTSKotlinStacktrace(
        [
          {
            type: 'warning',
            message:
              'Classpath entry points to a non-existent location: /Users/xxx/HBuilderProjects/test-x/unpackage/dist/dev/.kotlin/class',
          },
          {
            type: 'error',
            message: 'Unresolved reference: test',
            file: `${inputDir}/index.kt`,
            line: 19,
            column: 39,
          },
        ],
        {
          inputDir,
          sourceMapDir,
          replaceTabsWithSpace: true,
          format: hbuilderFormatter,
        }
      )
    ).toMatchSnapshot()
  })
})
