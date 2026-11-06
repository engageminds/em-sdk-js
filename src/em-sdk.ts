// em-sdk-js

import log from "./log"
import jsb from "./jsb"
import util from "./util"

import type {InitConfig, Properties, SDK as SDKApi} from './types'

const sdkv = __SDK_VERSION__

interface PresetProperties {
  appk?: string
  uid?: string
  ssid?: string
  session?: string
  flt?: number
}

interface EventRecord {
  ts: number
  eid: string
  cdid?: string
  props?: Properties
}

interface ServerResponse {
  ssid?: string
  evc?: {mn: number; ci: number}
}

type ResolvedConfig = InitConfig & {serverUrl: string; superProperties: Properties}
type RequestPayload = PresetProperties & typeof envProps & {
  ts: number
  sco: number
  bps?: Properties
  events?: EventRecord[]
}

const win = window
const doc = document
const storeKey = '__emStore__'

let maxInQueue = 9
let checkInterval = 5
let cfg: ResolvedConfig
let initVersion = 0
let visibilityHandler: (() => void) | undefined
let flushTimer: number | undefined
const flushOnUnload = () => SDK.flush(true)
let eventQueue: EventRecord[] = []
const timeEvents: Record<string, number> = {}
const presetProps: PresetProperties = {}
let cdid: string | undefined = ""
const envProps = (() => {
  const {os, osv} = util.os()
  const {type: dtype, brand, model} = util.device()
  return {
    zo: -new Date().getTimezoneOffset(),
    lang: navigator.language,
    width: screen.width,
    height: screen.height,
    sdk: 2,
    sdkv,
    adtk: !navigator.doNotTrack,
    os,
    osv,
    dtype,
    brand,
    model
  }
})()

const SDK: SDKApi = {
  get version() {
    return sdkv
  },
  init(opts) {
    if (!opts.appk) {
      log.error('appk required', opts)
      return
    }
    const version = ++initVersion
    stopAutoTrack()
    cfg = {
      ...opts,
      serverUrl: opts.serverUrl || 'https://a.engageminds.ai',
      superProperties: {...opts.superProperties}
    }
    util.delInvalids(cfg.superProperties)
    loadStore()
    presetProps.appk = cfg.appk
    if (cfg.ssid) {
      presetProps.ssid = cfg.ssid
    }
    if (jsb) {
      saveStore()
      initAutoTrack()
      return
    }

    post('/init', buildReq()).then(o => {
      if (version !== initVersion) return
      if (o.ssid) {
        log.debug('ResetSsid', o.ssid)
        presetProps.ssid = o.ssid
      }
      if (o.evc) {
        const {mn, ci} = o.evc
        maxInQueue = mn
        checkInterval = ci
      }
    }).catch(e => {
      log.error('InitErr', e)
    }).finally(() => {
      if (version !== initVersion) return
      saveStore()
      initAutoTrack()
    })
  },
  setSuperProperties(props) {
    if (!props) return
    util.delInvalids(props)
    Object.assign(cfg.superProperties, props)
    saveStore()
  },
  getSuperProperties() {
    return {...cfg.superProperties}
  },
  clearSuperProperties() {
    cfg.superProperties = {}
    saveStore()
  },
  unsetSuperProperty(name) {
    delete cfg.superProperties[name]
    saveStore()
  },
  login(userId) {
    if (jsb) return
    cdid = userId
    track('#user_login')
    saveStore()
  },
  logout() {
    if (jsb) return
    cdid = undefined
    track('#user_logout')
    saveStore()
  },
  getAccountId() {
    return cdid
  },
  getUid() {
    return presetProps.uid
  },
  getSsid() {
    return presetProps.ssid
  },
  setSsid(ssid) {
    presetProps.ssid = ssid
  },
  userSet(props) {
    track('#user_set', props)
  },
  userSetOnce(props) {
    track('#user_set_once', props)
  },
  userAdd(props) {
    track('#user_add', props)
  },
  userAppend(props) {
    track('#user_append', props)
  },
  userUniqAppend(props) {
    track('#user_uniq_append', props)
  },
  userUnset(...propName) {
    const props: Properties = {}
    for (let k of propName) {
      props[k] = 1
    }
    track('#user_unset', props)
  },
  userDel() {
    track('#user_del')
  },
  setTrackEventCallback(cb) {
    if (typeof cb !== 'function') {
      log.error('EventCallback is not a function', cb)
      return
    }
    cfg.trackEventCallback = cb
  },
  track(eid, props) {
    if (eid[0] === '#') {
      log.error('InvalidEventName', eid)
      return
    }
    util.delInvalids(props)
    track(eid, props)
  },
  timeEvent(eid) {
    timeEvents[eid] = Date.now()
  },
  flush(useBeacon) {
    if (eventQueue.length === 0) {
      return
    }
    try {
      const url = cfg.serverUrl + "/e"
      const req = buildReq()
      req.events = eventQueue
      if (useBeacon) {
        if (navigator.sendBeacon(url, util.formatJson(req))) {
          eventQueue = []
        } else {
          log.error("BeaconFlushFailed", req)
        }
      } else {
        const version = initVersion
        const response = post('/e', req)
        eventQueue = []
        response.then(o => {
          if (version !== initVersion) return
          if (o.ssid) {
            log.debug('ResetSsid', o.ssid)
            presetProps.ssid = o.ssid
            saveStore()
          }
        }).catch(e => {
          log.error('FetchFlushErr', e)
        })
      }
    } catch (e) {
      log.error("TrackFlushErr", e)
    }
  }
}

function initAutoTrack(): void {
  const {pageHide, pageShow} = cfg.autoTrack || {}
  if (pageHide || pageShow) {
    visibilityHandler = () => {
      let stat = doc.visibilityState
      if (stat === "visible" && win.outerWidth > 0) {
        pageShow && track('#js_page_show')
        pageHide && SDK.timeEvent('#js_page_hide')
      } else if (stat === "hidden") {
        pageHide && track('#js_page_hide')
      }
    }
    visibilityHandler()
    doc.addEventListener('visibilitychange', visibilityHandler)
  }
  if (!jsb) {
    win.addEventListener('beforeunload', flushOnUnload)
    flushTimer = win.setInterval(() => SDK.flush(), checkInterval * 1000)
  }
}

function stopAutoTrack(): void {
  if (visibilityHandler) {
    doc.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = undefined
  }
  if (flushTimer !== undefined) {
    win.clearInterval(flushTimer)
    flushTimer = undefined
  }
  win.removeEventListener('beforeunload', flushOnUnload)
}

function post(path: string, request: RequestPayload): Promise<ServerResponse> {
  return fetch(cfg.serverUrl + path, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain'}, // skip preflight
    body: util.formatJson(request)
  }).then(response => {
    if (response.status !== 200) {
      throw new Error(response.status + ' ' + response.statusText)
    }
    return response.json() as Promise<ServerResponse>
  })
}

function track(eid: string, props?: Properties): void {
  let ts = Date.now()
  if (!eid.startsWith('#user_')) {
    if (!props) props = {}
    props['#title'] = document.title
    props['#referrer'] = document.referrer
    props['#url'] = location.href

    if (jsb && Object.keys(cfg.superProperties).length) {
      props = Object.assign({}, cfg.superProperties, props)
    }

    if (cfg.trackEventCallback) {
      try {
        if (cfg.trackEventCallback(eid, util.wrapProps(props), eid[0] === '#') === false) {
          log.debug("IgnoreEvent", eid, props)
          return
        }
      } catch (e) {
        log.error('TrackEventCallbackErr', e)
      }
    }
    let start = timeEvents[eid]
    if (start) {
      delete timeEvents[eid]
      props['#duration'] = parseFloat(((ts - start) / 1000).toFixed(3))
    }
  }
  if (jsb) {
    jsb.track([{ts, eid, props}])
    return
  }
  if (eventQueue.push({ts, eid, cdid, props}) >= maxInQueue) {
    SDK.flush()
  }
}

function loadStore(): void {
  try {
    let v = win.localStorage.getItem(storeKey)
    if (v) {
      const {presets, supers, _cdid} = JSON.parse(v) as {
        presets?: PresetProperties
        supers?: Properties
        _cdid?: string
      }
      presets && Object.assign(presetProps, presets)
      supers && Object.assign(cfg.superProperties, supers)
      cdid = _cdid
    }
  } catch (e) {
    log.error('LoadStoreDataErr', e)
  }
  const browser = util.browser()
  Object.assign(cfg.superProperties, {
    '#browser': browser.type,
    '#browserv': browser.version,
  })
  const {uid, flt} = presetProps
  !uid && (presetProps.uid = util.UUID())
  !flt && (presetProps.flt = Math.floor(Date.now() / 1000))
  try {
    let v = win.sessionStorage.getItem(storeKey)
    if (v) {
      const {session} = JSON.parse(v) as {session?: string}
      session && (presetProps.session = session)
    }
  } catch (e) {
    log.error('LoadSesStoreDataErr', e)
  }
  const {session} = presetProps
  !session && (presetProps.session = util.UUID())
}

function saveStore(): void {
  try {
    win.localStorage.setItem(storeKey, util.formatJson({presets: presetProps, supers: cfg.superProperties, _cdid: cdid}))
  } catch (e) {
    log.error('SaveStoreDataErr', e)
  }
  try {
    win.sessionStorage.setItem(storeKey, util.formatJson({session: presetProps.session}))
  } catch (e) {
    log.error('SaveSesStoreDataErr', e)
  }
}

function buildReq(): RequestPayload {
  const req: RequestPayload = {
    ...presetProps,
    ...envProps,
    ts: Date.now(),
    sco: util.sco()
  }
  if (Object.keys(cfg.superProperties).length) {
    req.bps = cfg.superProperties
  }
  return req
}

export default SDK
