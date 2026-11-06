# EngageMinds JavaScript 接入文档

## 1. 接入准备

### 获取 AppKey

在 [EngageMinds 平台](https://dash.engageminds.ai) 页面，创建开发者账号，添加应用并获取 AppKey。

## 2. SDK 接入

### 2.1 通过 GitHub tag 接入

在业务项目的 `package.json` 中添加 GitHub tag 依赖。以下 `v1.0.0` 为示例版本，需要替换为 `engageminds/em-sdk-js` 仓库中已发布的实际 tag；仓库和对应 tag 发布后才能安装。

```json
{
  "dependencies": {
    "em-sdk-js": "github:engageminds/em-sdk-js#v1.0.0"
  }
}
```

执行 `npm install`，再在浏览器端代码中导入并初始化：

```js
import EmSdk from 'em-sdk-js'

EmSdk.init({
  appk: '{Replace With Your AppKey}'
})
```

也可以直接执行以下命令，自动写入 `package.json`：

```sh
npm install 'github:engageminds/em-sdk-js#v1.0.0'
```

安装环境需要 Node.js、npm 和 Git，并能访问 GitHub 及 npm 依赖源。包通过 `prepare` 在安装 Git 依赖时自动构建，无需将 `dist/` 提交到 Git，也无需发布到 npm registry。请保留安装脚本执行能力，不要使用 `--ignore-scripts`。

`import EmSdk from 'em-sdk-js'` 使用原生 ESM 产物 `dist/em-sdk.mjs`，不会写入 `window.EmSdk`；CommonJS 的 `require('em-sdk-js')` 使用 UMD 产物 `dist/em-sdk.min.js`。业务项目通过包名导入即可，无需关心产物路径。

升级时将依赖中的 tag 改为新的实际 tag，再执行 `npm install`，并提交业务项目更新后的 `package.json` 和 lock 文件。SDK 需要浏览器的 `window`、`document` 等对象，在 Next.js 等 SSR 项目中应在客户端动态导入。

Git 依赖和安装构建规则参见 [npm package.json 文档](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#git-urls-as-dependencies)及 [prepare 生命周期说明](https://docs.npmjs.com/cli/v11/using-npm/scripts/#life-cycle-scripts)。

### 2.2 TypeScript 接入

SDK 源码使用 TypeScript，构建时从公开接口自动生成类型声明，安装后自动识别，无需额外安装 `@types` 包。配置、属性及事件回调均支持类型提示：

```ts
import EmSdk from 'em-sdk-js'
import type {InitConfig, Properties} from 'em-sdk-js'

const config: InitConfig = {
  appk: '{Replace With Your AppKey}',
  autoTrack: {pageShow: true, pageHide: true},
  trackEventCallback(eventId, properties, isAuto) {
    properties.source = 'web'
    return true
  }
}

EmSdk.init(config)

const properties: Properties = {name: 'product_name', count: 1}
EmSdk.track('product', properties)
```

CommonJS TypeScript 项目也可使用 `import EmSdk = require('em-sdk-js')`，通过 `EmSdk.InitConfig` 等类型声明配置。ESM 和 CommonJS 会分别解析对应的声明入口。类型声明只包含公开 API，不暴露内部方法。

### 2.3 通过 script 标签接入

将本仓库构建得到的 `dist/em-sdk.min.js` 放到站点或 CDN 可访问的位置，再引入页面。以下示例假设文件位于本站的 `/js/` 路径：

```html
<script src="/js/em-sdk.min.js"></script>
```

此方式使用 UMD 产物，通过浏览器全局变量 `EmSdk` 调用 SDK。请使用本仓库的构建产物，以确保与 GitHub tag 版本一致。

## 3. 常用功能

### 3.1 初始化

将以下代码置入初始化代码中，并配置对应参数：

```javascript
EmSdk.init({
  appk: '{Replace With Your AppKey}',
  ssid: '{Replace With Your SSID}',
  autoTrack: {
    pageHide: true, // 开启页面隐藏事件
    pageShow: true  // 开启页面展示事件
  },

  // 设置公共事件属性，也可通过调用 EmSdk.setSuperProperties(properties) 合并更新
  superProperties: {
    super_num: 2345,
    super_str: 'abcd'
  },

  // 设置事件采集回调，在事件采集发生时，获取到当前事件的事件类型以及事件属性。根据返回值决定事件是否入库。
  // 返回 true 则当前事件会入库并正常上报，返回 false 则表示丢弃该条事件。
  // 也可通过调用 EmSdk.setTrackEventCallback(cb) 替换
  trackEventCallback(eid, props, isAuto) {
    props['test_super'] = 'test_value'
    console.log('track', eid, props, isAuto)
    return true
  }
})
```

### 3.2 账号设置

#### 设置账户ID

在用户进行登录时，可调用 `login` 来设置用户的账号 ID，EngageMinds平台将会以账号ID作为身份识别ID，并且设置的账号ID将会在调用 `logout` 之前一直保留，多次调用 `login` 将覆盖先前的账号ID。

```js
EmSdk.login('{UserId}');
```

#### 清空账号ID

用户可调用 `logout` 来清除账号 ID。

```js
EmSdk.logout();
```

### 3.3 用户属性

EngageMinds 支持用户属性设置API有: `userSet`、`userUnset`、`userSetOnce`、`userAdd`、`userAppend`、`userUniqAppend`、`userDel`。

#### userSet

可调用该接口来设置用户属性，该接口上传的属性将会覆盖原有的属性值（如果该属性已存在）。

```js
EmSdk.userSet({'name': 'Tom', 'phone': '13000000000'});
```

#### userUnset

可调用该接口来对指定用户用户属性进行删除操作。

```js
EmSdk.userUnset('name', 'phone');
```

#### userSetOnce

如需上传的用户属性只要设置一次，则可以调用 `userSetOnce` 来进行设置用户一次性属性，多次调用接口上传的属性不会覆盖首次设置的属性。

```js
EmSdk.userSetOnce({'payment_time': '2023-08-01 17:22:33.678'});
```

#### userAdd

可调用该接口来对数值型的属性进行累加操作。

```js
EmSdk.userAdd({'total_revenue': 90});//此时 total_revenue 为 90
EmSdk.userAdd({'total_revenue': 110});//此时 total_revenue 为 200
```

#### userAppend

可调用该接口对数组类型的属性进行追加操作，用户属性可以存在重复。

```js
EmSdk.userAppend({'music': ['Classic', 'Popular']});//此时music的属性值为['Classic'，'Popular']
```

#### userUniqAppend

可调用该接口对数组类型的属性进行追加操作，并对追加的用户属性进行去重。

```js
EmSdk.userAppend({'prop': ['Football']});//此时 prop 的属性值为['Football']

let properties = {'prop': ['Football', 'Basketball']};
EmSdk.userAppend(properties);// 此时 prop 的属性值为['Football', 'Football', 'Basketball']

EmSdk.userUniqAppend(properties);// 此时 prop 的属性值为['Football', 'Basketball']
```

#### userDel

可调用该接口删除账户。

```js
EmSdk.userDel();
```

### 3.4 发送事件

#### 普通事件

可调用该接口来上报事件。

```js
EmSdk.track('product', {'name': 'product_name', 'count': 10, 'price': 1.1});
```

#### 记录事件时长

如需记录某个事件的持续时长，可以调用 `timeEvent` 来开始计时。当上传该事件时，将会自动在事件属性中加入 `#duration` 这一属性来表示记录的时长，单位为秒。需要注意的是，同一个事件名只能有一个在计时的任务。

```js
EmSdk.timeEvent('time_event');
// do something
//调用 track 方法上报事件，计时结束，'time_event' 事件中将会带有时长属性#duration
EmSdk.track('time_event');
```

#### 立即上报事件

可调用该接口将数据立即上报到 EngageMinds 服务器。

```js
EmSdk.flush();
```

### 3.5 公共事件属性
#### 设置公共事件属性

公共事件属性指的就是每个事件都会上传的属性。通过 `setSuperProperties` 设置公共事件属性之后，SDK将会在事件采集时获取设置的公共事件属性作为事件的属性。

公共事件属性将会被保存到缓存中，无需每次启动 App 时调用。如果调用 `setSuperProperties` 上传了先前已设置过的公共事件属性，则会覆盖之前的属性。

- Key 为该属性的名称，为字符串类型。
- Value 为该属性的值，支持字符串、数字、布尔、时间、对象、对象组、数组类型。

```js
EmSdk.setSuperProperties({'vip_level': 5, 'vip_name': 'SuperVip', 'vip_title': 'SuperTitle'});
```

#### 清除指定公共事件属性

清除指定公共事件属性，将之前设置的 `vip_title` 属性清除。

```js
EmSdk.unsetSuperProperty('vip_title');
```

#### 清空公共事件属性

清除所有公共事件属性。

```js
EmSdk.clearSuperProperties();
```

#### 获取公共事件属性

获取所有公共事件属性。

```js
EmSdk.getSuperProperties();
```

### 3.6 事件采集设置回调

可通过设置事件采集回调，在事件采集发生时，获取到当前事件的事件类型以及事件属性。SDK 根据返回值决定埋点事件是否入库，返回 true 则当前事件会入库并正常上报，返回 false 则表示丢弃该条事件。并且可通过修改事件属性的方式为该事件增加或者删除事件属性。

```js
// 设置事件采集回调
EmSdk.setTrackEventCallback((eid, props, isAuto) => {
  // 修改事件属性
  props['test_super'] = 'test_value'
  return true
});
```

# H5 与 APP SDK 打通

## 一. 方案介绍

在 APP 当中，可能会有一些页面是由 H5 页面所构成的，此时 APP SDK 无法对 H5 页面进行数据采集，需要搭配使用 JavaScript SDK 对用户在 H5 页面的行为进行采集，为了保证  JavaScript SDK 与 APP SDK 的数据保持一致，在 SDK 中加入了数据打通功能：

H5 页面使用 JavaScript SDK 进行数据采集，采集到数据后通过 APP SDK（即 Android SDK 与 iOS SDK）发送到服务器。APP SDK 会对 JavaScript SDK 采集的数据进行调整，规则如下：

1. 保留 JavaScript SDK 传入的时间戳 `ts`，即事件的时间以触发埋点的时间为准。
2. 使用 APP SDK 的用户 ID（调用 `login` 方法传入的 ID），以 APP SDK 维护的用户为准。
3. 加入 APP SDK 的预置属性，如果与 JavaScript 的预置属性冲突，则以 APP SDK 的预置属性为准。比如 `sdk`、`sdkv` 字段，APP SDK 的值会覆盖 JavaScript SDK 的值。
4. APP SDK 的公共属性：如果与 JavaScript 传入的属性冲突，则丢弃 APP SDK 公共属性值；如果 JavaScript SDK 没有该属性，则加入到上报数据中。
5. APP SDK 中的 `timeEvent`  接口可以对 JavaScript SDK 采集的事件生效。
6. JavaScript SDK 中的 `login`、`logout` 接口无法修改 APP SDK 中的用户 ID，在 H5 与 APP SDK 打通的情况下，在 JavaScript SDK 中通过上述接口无法对数据的用户 ID 进行修改。
7. 当开启 H5 与 APP SDK 打通的开关后，如果运行环境中并不存在 APP SDK，则 JavaScript SDK 将会直接上报数据，等同于未开启打通的状态。

## 二. 使用方法
如需开启 H5 与 APP SDK 打通功能，需要在 APP SDK 进行如下配置。

### 2.1 Android SDK 使用方法

在初始化 `WebView` 时调用 `setJsBridge` 接口，此方法会启用 **`WebView JavaScript 以及 DomStorage`**。

```java
EmAnalytics.setJsBridge(webView);
```

### 2.2 iOS SDK 使用方法

在初始化 `WebView` 时调用 `addJsBridge` 接口。

```objective-c
[EngageMinds addJsBridge:webView];
```

```swift
EngageMinds.addJsBridge(webview)
```

## 本地开发与构建

安装 Node.js 和 npm 后，在项目目录执行：

```sh
# 安装依赖，并通过 prepare 自动构建
npm install

# 类型检查、生成声明并构建 ESM/UMD 产物
npm run build

# 单独检查 TS 源码
npm run typecheck

# 单独生成类型声明
npm run build:types
```

`src/index.ts` 为模块入口，`src/types.ts` 定义公开接口；实现通过严格类型检查与接口保持一致。Webpack 配置保留 JavaScript。

构建生成 `dist/em-sdk.mjs` 供模块导入、`dist/em-sdk.min.js` 供 CommonJS 和 `<script>` 接入，以及 `dist/api.d.ts`、`dist/index.d.ts`、`dist/index.d.mts` 三个类型声明文件。声明文件由构建自动生成，不手动维护。
