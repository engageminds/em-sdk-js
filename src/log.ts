// SDK 日志

function pad(n: number, len = 2) {
  const s = n.toString()
  return '0000'.substring(0, len - s.length) + s
}

function write(writer: (...args: unknown[]) => void, ...args: unknown[]) {
  const d = new Date()
  writer(`\x1B[36m${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}\x1B[0m \x1B[32m-\x1B[0m \x1B[33m${args.shift()}\x1B[0m`, ...args);
}

export default {
  debug(...args: unknown[]) {
    if (__DEV__) {
      write(console.debug, ...args)
    }
  },
  warn(...args: unknown[]) {
    write(console.warn, ...args)
  },
  error(...args: unknown[]) {
    write(console.error, ...args)
  }
}
