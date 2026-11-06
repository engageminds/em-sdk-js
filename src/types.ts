/** 属性支持嵌套对象、数组及日期；对象中的 null/undefined 属性不会上报。 */
export type PropertyValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | PropertyValue[]
  | { [key: string]: PropertyValue };

export type Properties = Record<string, PropertyValue>;

export interface AutoTrack {
  /** 自动采集页面隐藏事件。 */
  pageHide?: boolean;
  /** 自动采集页面展示事件。 */
  pageShow?: boolean;
}

/** 返回 false 丢弃事件；返回 true 或不返回值时正常采集。 */
export type TrackEventCallback = (
  eventId: string,
  properties: Properties,
  isAuto: boolean
) => boolean | void;

export interface InitConfig {
  /** EngageMinds 平台分配的 AppKey。 */
  appk: string;
  /** 上报服务地址，默认 https://a.engageminds.ai。 */
  serverUrl?: string;
  ssid?: string;
  autoTrack?: AutoTrack;
  superProperties?: Properties;
  trackEventCallback?: TrackEventCallback;
}

export interface SDK {
  readonly version: string;

  /** 初始化 SDK；其余方法应在初始化之后调用。此方法不返回 Promise。 */
  init(config: InitConfig): void;

  /** 合并公共事件属性，同名属性会被覆盖。 */
  setSuperProperties(properties: Properties): void;
  getSuperProperties(): Properties;
  clearSuperProperties(): void;
  unsetSuperProperty(name: string): void;

  login(userId: string): void;
  logout(): void;
  /** 未登录时可能返回空字符串或 undefined。 */
  getAccountId(): string | undefined;
  /** 初始化完成前可能为 undefined。 */
  getUid(): string | undefined;
  getSsid(): string | undefined;
  setSsid(ssid: string): void;

  userSet(properties: Properties): void;
  userSetOnce(properties: Properties): void;
  userAdd(properties: Record<string, number>): void;
  userAppend(properties: Record<string, PropertyValue[]>): void;
  userUniqAppend(properties: Record<string, PropertyValue[]>): void;
  userUnset(...propertyNames: string[]): void;
  userDel(): void;

  setTrackEventCallback(callback: TrackEventCallback): void;
  track(eventId: string, properties?: Properties): void;
  timeEvent(eventId: string): void;
  /** 立即发送队列；useBeacon 为 true 时使用 sendBeacon。不返回 Promise。 */
  flush(useBeacon?: boolean): void;
}
