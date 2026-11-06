const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const configPath = path.join(root, 'tsconfig.json')
const config = ts.readConfigFile(configPath, ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
const program = ts.createProgram(parsed.fileNames, {
  ...parsed.options,
  noEmit: false,
  declaration: true,
  emitDeclarationOnly: true
})
const diagnostics = [
  ...(config.error ? [config.error] : []),
  ...parsed.errors,
  ...ts.getPreEmitDiagnostics(program)
]
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file,
    getCurrentDirectory: () => root,
    getNewLine: () => '\n'
  }))
  process.exit(1)
}

// 只发布公共类型；实现、工具和原生桥接模块的声明不写入产物。
let publicDeclaration
const result = program.emit(undefined, (filename, content) => {
  if (path.basename(filename) === 'types.d.ts') publicDeclaration = content
})
if (result.emitSkipped || !publicDeclaration) {
  throw new Error('公共类型声明生成失败')
}

const checker = program.getTypeChecker()
const source = program.getSourceFile(path.join(root, 'src/types.ts'))
const names = checker.getExportsOfModule(checker.getSymbolAtLocation(source))
  .map(symbol => symbol.name)
  .sort()
if (!names.includes('SDK')) throw new Error('公共类型缺少 SDK 接口')

const destination = path.join(root, 'dist')
fs.mkdirSync(destination, {recursive: true})
fs.writeFileSync(path.join(destination, 'api.d.ts'), publicDeclaration)
fs.writeFileSync(path.join(destination, 'index.d.mts'), [
  "import type {SDK} from './api.js';",
  `export type {${names.join(', ')}} from './api.js';`,
  'declare const EmSdk: SDK;',
  'export default EmSdk;',
  ''
].join('\n'))
fs.writeFileSync(path.join(destination, 'index.d.ts'), [
  "import type * as API from './api.js';",
  'declare const EmSdk: API.SDK;',
  'declare namespace EmSdk {',
  ...names.map(name => `  type ${name} = API.${name};`),
  '}',
  'export = EmSdk;',
  'export as namespace EmSdk;',
  ''
].join('\n'))
console.log('已从 TS 源码生成公共类型声明及 ESM/CommonJS 类型入口。')
