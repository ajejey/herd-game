/** @type {import('next').NextConfig} */
const nextConfig = {
   experimental: {
     serverComponentsExternalPackages: ['node-appWrite']
   },
    webpack: (config) => {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      })
      // config.plugins.push(
      //   new webpack.NormalModuleReplacementPlugin(
      //     /^isomorphic-form-data$/,
      //     `${config.context}/form-data-mock.js`
      //   )
      // )
      return config
    },
  }
  
  module.exports = nextConfig