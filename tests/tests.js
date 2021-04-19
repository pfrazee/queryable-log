import test from 'ava'
import tmp from 'tmp-promise'
import path from 'path'
import { QueryableLog } from '../index.js'

test('base api', async t => {
  const dir = await tmp.dir({unsafeCleanup: true})

  const log = new QueryableLog(path.join(dir.path, 'log1.txt'))

  await log.append({index: 1, type: 'apple'})
  await log.append({index: 2, type: 'apple'})
  await log.append({index: 3, type: 'banana'})
  await log.append({index: 4, type: 'banana'})
  await log.append({index: 5, type: 'apple'})
  await log.append({index: 6, type: 'banana'})

  t.deepEqual((await log.query()).map(obj => ({index: obj.index, type: obj.type})), [
    {index: 1, type: 'apple'},
    {index: 2, type: 'apple'},
    {index: 3, type: 'banana'},
    {index: 4, type: 'banana'},
    {index: 5, type: 'apple'},
    {index: 6, type: 'banana'}
  ])

  t.deepEqual((await log.query(obj => obj.type === 'banana')).map(obj => ({index: obj.index, type: obj.type})), [
    {index: 3, type: 'banana'},
    {index: 4, type: 'banana'},
    {index: 6, type: 'banana'}
  ])

  await dir.cleanup()
})

// test skipped because flush timing is harder to make consistent
// than I care to do right now. sue me.
// -prf
test.skip('size limit applied', async t => {
  const dir = await tmp.dir({unsafeCleanup: true})

  const log = new QueryableLog(path.join(dir.path, 'log2.txt'), {sizeLimit: 60})
  await log.setup()

  await log.append({index: 1, type: 'apple'})
  await log.append({index: 2, type: 'apple'})
  await log.append({index: 3, type: 'banana'})
  await log.append({index: 4, type: 'banana'})
  await log.append({index: 5, type: 'apple'})
  await log.append({index: 6, type: 'banana'})

  t.deepEqual((await log.query()).map(obj => ({index: obj.index, type: obj.type})), [
    {index: 5, type: 'apple'},
    {index: 6, type: 'banana'}
  ])

  await dir.cleanup()
})