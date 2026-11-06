import type {Properties, PropertyValue} from './types'
import log from "./log";
import UAParser from "ua-parser-js";

const ua = navigator.userAgent
const uap = new UAParser(ua)
export default {
  UUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      let r = Math.random() * 16 | 0
      let v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  },
  washValue(v: unknown): unknown {
    if (v === null) {
      return undefined
    }
    switch (typeof v) {
      case "boolean":
        return v ? 1 : 0
      case "string":
        return v === '' ? undefined : v
      case "function":
        return undefined
      case "number":
        return isFinite(v) ? v : undefined
      default:
        if (v instanceof Date) {
          return v.getTime()
        }
        return v
    }
  },
  formatJson(o: object): string {
    return JSON.stringify(o, (k, v) => {
      return this.washValue(v)
    })
  },
  delInvalids(props?: Properties): void {
    if (!props) return
    for (let [k, v] of Object.entries(props)) {
      if (k[0] === '#') {
        log.warn('InvalidPropertyName', k, v)
        delete props[k]
        continue
      }
      props[k] = this.washValue(v) as PropertyValue
    }
  },
  wrapProps(props: Properties): Properties {
    const t = this
    return new Proxy(props, {
      set(target, p, v: unknown, receiver) {
        log.debug('set', p, v)
        if (typeof p === 'string' && p[0] === '#') {
          log.warn('SetPropertyDenied', p)
          return true
        }
        v = t.washValue(v)
        return Reflect.set(target, p, v, receiver)
      },
      deleteProperty(target, p) {
        if (typeof p === 'string' && p[0] === '#') {
          log.warn('DelPropertyDenied', p)
          return true
        }
        return Reflect.deleteProperty(target, p)
      }
    })
  },
  os() {
    let {name = '', version} = uap.getOS()
    let os = 1
    if (name.search('Android') === 0) {
      os = 1
    } else if (name === 'iOS') {
      os = 0
    } else if (name === 'Mac OS') {
      os = 3
    } else if (name === 'HarmonyOS') {
      os = 2
      let m = ua.match(/HarmonyOS ([^;) ]+)/)
      if (m) version = m[1]
    } else if (name.search('Windows') === 0) {
      os = 4
    } else if (name === 'Ubuntu' || name === 'Fedora' || name === 'Debian' || name === 'Linux' || name === 'Unix') {
      os = 5
    }
    return {os, osv: version}
  },
  device() {
    const o = uap.getDevice()
    let type = 4
    if (o.type === 'mobile') {
      type = 1
    } else if (o.type === 'tablet') {
      type = 2
    }
    return {type, brand: o.vendor, model: o.model}
  },
  sco() {
    if (matchMedia("(orientation: portrait)").matches) {
      return 1
    }
    if (matchMedia("(orientation: landscape)").matches) {
      return 2
    }
    return 0
  },
  browser() {
    const o = uap.getBrowser()
    return {type: o.name, version: o.version}
  }
}
