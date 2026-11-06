import type {Properties} from './types'

interface BridgeEvent {
  ts: number
  eid: string
  props?: Properties
}

interface NativeBridge {
  track(events: BridgeEvent[]): void
}

type BridgeWindow = Window & {
  EventTracker_JS_Bridge?: {track(payload: string): void}
  webkit?: {messageHandlers: Record<string, {postMessage(payload: string): void}>}
}

let jsb: NativeBridge | undefined
const w = window as BridgeWindow
const ns = 'EventTracker_JS_Bridge'
const androidBridge = w[ns]
if (androidBridge) {
  jsb = {
    track(es) {
      androidBridge.track(JSON.stringify(es))
    }
  }
} else if (w.webkit && w.webkit.messageHandlers && w.webkit.messageHandlers[ns]) {
  const handler = w.webkit.messageHandlers[ns]
  jsb = {
    track(es) {
      handler.postMessage(JSON.stringify({m: 'track', p: es}))
    }
  }
}

export default jsb
