const path = require('path')
const webpack = require('webpack')

function createConfig(name, filename, library, mode) {
  return {
    name,
    entry: path.join(__dirname, 'src/index.ts'),
    resolve: {extensions: ['.ts', '.js']},
    module: {
      rules: [{
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {transpileOnly: true, compilerOptions: {noEmit: false}}
        }
      }]
    },
    plugins: [
      new webpack.DefinePlugin({
        __SDK_VERSION__: JSON.stringify(require('./package.json').version),
        __DEV__: JSON.stringify(mode !== 'production')
      })
    ],
    output: {
      path: path.join(__dirname, 'dist'),
      filename,
      library
    }
  }
}

module.exports = (_env, argv) => {
  const mode = argv.mode || 'production'
  const umd = createConfig('umd', 'em-sdk.min.js', {
    name: 'EmSdk',
    type: 'umd',
    export: 'default'
  }, mode)
  const esm = createConfig('esm', 'em-sdk.mjs', {type: 'module'}, mode)
  esm.experiments = {outputModule: true}

  return [umd, esm]
}
