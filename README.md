# Queryable-Log

A structured append-only log which can be queried. Stores as ndjson and applies a log-size limit.

```
npm i queryable-log
```

Example usage:

```js
const log = new QueryableLog(path.join(dir.path, 'log1.txt'))

await log.append({index: 1, type: 'apple'})
await log.append({index: 2, type: 'apple'})
await log.append({index: 3, type: 'banana'})
await log.append({index: 4, type: 'banana'})
await log.append({index: 5, type: 'apple'})
await log.append({index: 6, type: 'banana'})

await log.query() /* => [
  {index: 1, type: 'apple', ts: 1618872429869},
  {index: 2, type: 'apple', ts: 1618872438715},
  {index: 3, type: 'banana', ts: 1618872442607},
  {index: 4, type: 'banana', ts: 1618872446504},
  {index: 5, type: 'apple', ts: 1618872450726},
  {index: 6, type: 'banana', ts: 1618872454478}
] */

await log.query(obj => obj.type === 'banana') /* => [
  {index: 3, type: 'banana'},
  {index: 4, type: 'banana'},
  {index: 6, type: 'banana'}
]*/
```

## API

### `new QueryableLog(filepath[, {sizeLimit, overwrite}])`

The `sizeLimit` defaults to 5mb. The `overwrite` flag will delete the existing log on open; it defaults to false.

### `await log.append(obj)`

Adds an object to the log. The `.ts` attribute is automatically added with `Date.now()`.

### `await log.query([queryFn])`

Queries the log file. Takes an optional query function to filter results during the read-stream. Returns an array.

### `await log.close()`

Closes the internal write stream.