'use strict'

const processor = require('./lib/processor')
const debug = require('debug')('metalsmith-contentful-files')
const CHUNKSIZE = 100
const INTERVAL = 1500
/**
 * Plugin function
 *
 * @param {Object|undefined} options
 *
 * @return {Function} Function to be used in metalsmith process
 */
function plugin (options) {
  options = options || {}

  /**
   * Function to process all read files by metalsmith
   *
   * @param  {Object}   files      file map
   * @param  {Object}   metalsmith metalsmith
   * @param  {Function} done       success callback
   */
  return function (files, metalsmith, done) {
    options.metadata = metalsmith.metadata()

    debug('Files before processing:')
    debug(files)

    return new Promise(resolve => {
      resolve(Object.keys(files))
    })
    .then(fileNames => {

      const processFilePromisse = item => {
        files[item]._fileName = item
        debug(new Date() + ' Processing: ' + item)
        return Promise.resolve(processor.processFile(files[item], options))
      }

      const processFilesAsync = async item => {
        return processFilePromisse(item)
      }

      const processFiles = async () => {
        const promises = []

        for(let f=0 ; f < fileNames.length ; f+=CHUNKSIZE){
          let chunck = fileNames.slice(f, f + CHUNKSIZE)

          chunck.forEach(fileName => {
            promises.push(processFilesAsync(fileName))
          })

          //Wait because of Contentful API Rate Limmit (100 requests per second)
          await new Promise(r => setTimeout(r, INTERVAL));
        }
        return Promise.all(promises)
      }

      return processFiles()
    })
    .then((fileMaps) => {
      fileMaps.forEach(map => {
        Object.assign(files, map)
      })

      debug('Files after processing:')
      debug(files)

      done()
    })
    .catch((error) => {
      // friendly error formatting to give
      // more information in error case by api
      // -> see error.details
      done(
        new Error(`
          ${error.message}
          ${error.details ? JSON.stringify(error.details, null, 2) : ''}
        `)
      )
    })
  }
}

module.exports = plugin
