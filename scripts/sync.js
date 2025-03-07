const path = require('path')
const fs = require('fs-extra')
const { sync } = require('fast-glob')
const { config } = require('dotenv')
config()
if (process.env.UNI_APP_SYNTAX_DIR) {
  fs.copySync(path.resolve(process.env.UNI_APP_SYNTAX_DIR, 'uts/common'), path.resolve(__dirname, '../packages/uni-uts-v1/lib/uts/types/uts/common'))
  fs.copySync(path.resolve(process.env.UNI_APP_SYNTAX_DIR, 'uts/app-android'), path.resolve(__dirname, '../packages/uni-uts-v1/lib/uts/types/uni-x/app-android'))
  fs.copySync(path.resolve(process.env.UNI_APP_SYNTAX_DIR, 'uts/app-ios'), path.resolve(__dirname, '../packages/uni-uts-v1/lib/uts/types/uni-x/app-ios'))
  fs.copySync(path.resolve(process.env.UNI_APP_SYNTAX_DIR, 'uts/app-js'), path.resolve(__dirname, '../packages/uni-uts-v1/lib/uts/types/uni-x/app-js'))
}
if (process.env.UNI_APP_VUE_TYPES_DIR) {
  ['reactivity', 'runtime-core', 'shared'].forEach(pkg => {
    const fileName = pkg + '/dist/' + pkg + '.d.ts'
    fs.copySync(
      path.resolve(process.env.UNI_APP_VUE_TYPES_DIR, 'packages', fileName),
      path.resolve(__dirname, '../packages/uni-uts-v1/lib/uts/types/uni-x/@vue', fileName)
    )
  })
}

// process.env.UNI_APP_TYPES_APP_ANDROID = '/Applications/HBuilderX-Dev.app/Contents/HBuilderX/plugins/uts-development-android/uts-types/app-android'
// const androidPaths = {}
// sync('**/*.d.ts', {
//   cwd: process.env.UNI_APP_TYPES_APP_ANDROID, ignore: [
//     // '*.d.ts',
//     // 'uts',
//     // 'dc',
//     // 'io',
//     // '**/dcloud/**/*',
//     // '**/weex/**/*',
//     // '**/bindingx/**/*',
//   ]
// })
//   .forEach(file => {
//     const dirname = path.dirname(file).replace(/\\/g, '/')
//     // 白名单：
//     if (!['android', 'androidx', 'java', 'javax', 'kotlin', 'kotlinx'].some((name) => dirname.startsWith(name + '/'))) {
//       return
//     }
//     const packageName = dirname.replace(/\//g, '.')
//     if (androidPaths[packageName]) {
//       return
//     }
//     androidPaths[packageName + '.*'] = [`${dirname}/*.d.ts`]

//   })
// console.log('app-android paths', Object.keys(androidPaths).length)
// fs.outputFileSync(
//   path.resolve(__dirname, '../packages/uni-uts-v1/lib/uts/types/uni-x/app-android/paths.json'),
//   JSON.stringify(androidPaths, null, 2)
// )
