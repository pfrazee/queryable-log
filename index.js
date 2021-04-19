import fs, { promises as fsp } from 'fs'
import pump from 'pump'
import concat from 'concat-stream'
import through2 from 'through2'
import ndjson from 'ndjson'

const DEFAULT_SIZE_LIMIT = 5e6

export class QueryableLog {
  constructor (filepath, {sizeLimit} = {sizeLimit: DEFAULT_SIZE_LIMIT}) {
    this.filepath = filepath
    this.writeStream = undefined
    this.estimatedSize = 0
    this.sizeLimit = sizeLimit
  }

  async append (obj) {
    if (!this.writeStream) await this._open()
    
    obj.ts = Date.now()
    const str = JSON.stringify(obj) + '\n'
    this.estimatedSize += str.length
    this.writeStream.write(str)

    if (this.estimatedSize > this.sizeLimit) {
      await this._applySizeLimit()
    }
  }

  async query (queryFn = undefined) {
    return new Promise((resolve, reject) => {
      pump(
        fs.createReadStream(this.filepath, {flags: 'r'}),
        ndjson.parse(),
        through2.obj(function (entry, enc, cb) {
          if (!queryFn || queryFn(entry)) {
            this.push(entry)
          }
          cb()
        }),
        concat({encoding: 'object'}, arr => resolve(arr)),
        reject
      )
    })
  }

  async close () {
    if (this.writeStream) {
      this.writeStream.end()
      this.writeStream = undefined
    }
  }

  async _applySizeLimit () {
    let st = await fsp.stat(this.filepath).catch(e => undefined)
    this.estimatedSize = st?.size || 0
    if (this.estimatedSize <= this.sizeLimit) return

    await this.close() // close append-only fd
    while (this.estimatedSize > this.sizeLimit) {
      // truncate from the start by 25%
      let rawLines = await this._readRawLines()
      rawLines = rawLines.slice((Math.max(rawLines.length / 4, 1)|0), rawLines.length)
      await this._writeRawLines(rawLines)

      // make sure we're under the size limit
      st = await fsp.stat(this.filepath).catch(e => undefined)
      this.estimatedSize = st?.size
    }
    await this._open() // reopen
  }

  async _readRawLines () {
    const raw = await fsp.readFile(this.filepath, 'utf8')
    return raw.split('\n')
  }

  async _writeRawLines (rawLines) {
    await fsp.writeFile(this.filepath, rawLines.join('\n'), 'utf8')
  }

  async _open () {
    if (!this.writeStream) {
      this.writeStream = await fs.createWriteStream(this.filepath, {flags: 'a'})
    }
  }
}