# 开发在线元数据和封面插件

插件是用户主动导入的 UTF-8 JavaScript 文件。它根据用户输入的歌曲名和艺术家查询来源，返回候选字段和可选封面地址。用户在应用内选择来源、发起搜索、检查结果并勾选要使用的内容；应用把选中的内容放入编辑状态，最后仍由用户决定覆盖原文件或另存为。

应用内置 MusicBrainz 搜索，也支持第三方脚本。插件只能用于在线匹配，不是 Android APK、浏览器扩展或其他软件的插件格式。需要安装包含 **插件 API 1** 的应用构建；旧版本可能没有插件入口。

## 快速开始

1. 下载 [MusicBrainz 示例插件](../examples/plugins/musicbrainz.js)，保存为 `.js` 文件。示例使用公开 API，网络可用性和服务限流由对应服务决定。
2. 在椒盐音频分析打开歌曲的元数据编辑页，点击右上角搜索按钮，选择“导入插件”。
3. 选择脚本，检查名称、版本和声明的网络域名，确认导入。
4. 选择导入的来源，输入歌曲名或艺术家并搜索；选择候选结果，检查字段和封面后应用。
5. 在编辑页确认修改，再覆盖原文件或另存为。

MusicBrainz 的[公共 API](https://musicbrainz.org/doc/MusicBrainz_API) 当前说明非商业用途免费、商业用途需联系官方或选择商业方案；其核心数据许可和公共服务的使用条件需要分别确认。请求应携带可识别的 User-Agent，并遵守每客户端每秒最多一次等[限流规则](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting)。封面来自 Cover Art Archive，图片本身可能受版权保护，不应将元数据许可视为图片许可。

封面地址会重定向到 Internet Archive；搜索成功并不代表设备一定能访问封面服务器。网络或服务不可用时，字段仍可单独应用。

同一 ID 的脚本在确认后可替换。用户也可以删除已导入的插件。导入不会自动运行搜索；插件在用户选中来源并搜索时执行。

## 最小插件

将下面内容保存为 UTF-8 `.js` 文件；`api.example.org` 和返回数据结构只是示例，需替换为你自己的实际服务。

```javascript
/* salt-audio-plugin
{
  "api": 1,
  "id": "org.example.music-source",
  "name": "示例来源",
  "version": "1.0.0",
  "hosts": ["api.example.org", "images.example.org"]
}
*/

function* search(query) {
  const response = yield {
    url: "https://api.example.org/search?q=" + encodeURIComponent(query.title),
    headers: { Accept: "application/json" }
  };
  if (response.status !== 200) throw new Error("Search failed");
  const data = JSON.parse(response.body);
  return data.results.map(item => ({
    fields: { TITLE: item.title, ARTIST: item.artist, ALBUM: item.album },
    coverUrl: item.cover
  }));
}
```

`search` 必须返回同步生成器。`yield` 将请求交给宿主执行，宿主把响应送回生成器，最终 `return` 候选数组。这个执行环境不是浏览器或 Node.js，不提供 `fetch`、DOM、`require`、定时器或宿主 Android API；不要使用 `async function` 代替生成器。用户设备不会自动安装 npm 依赖，脚本应自行包含所需的 JavaScript 代码并遵守大小限制。

## 文件头

文件开头（允许 BOM 和空白）必须有 `/* salt-audio-plugin` 标识的注释，注释内是 JSON 对象：

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `api` | 整数 | 当前为 `1` |
| `id` | 字符串 | 全局唯一，1–64 字符；首字符为英文字母或数字，之后可使用英文字母、数字、`.`、`_`、`-`；不能是 `builtin` |
| `name` | 字符串 | 显示给用户，去除首尾空白后为 1–80 字符，不含控制字符 |
| `version` | 字符串 | 去除首尾空白后为 1–32 字符，不含控制字符 |
| `hosts` | 字符串数组 | 1–16 个不重复的 HTTPS 域名，包含搜索、封面及所有重定向目标 |

域名使用 ASCII，例如 `api.example.org`。支持 `*.cdn.example.org` 匹配其下的子域名，但它不匹配 `cdn.example.org` 本身；两者都需要时应分别声明。不能声明端口、路径、IP 地址或 `localhost`。域名会显示在导入确认界面，应只声明插件实际需要的来源。

## 搜索请求

`search(query)` 收到的 `query` 为 `{ title, artist }`。两项都是字符串，可能为空；用户输入会发送给所选插件的来源，请只请求实现搜索所需的数据。

每个 `yield` 对象描述一次 HTTPS 请求：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `url` | 是 | 声明域名上的 HTTPS 地址，默认端口或 443；最长 4096 字符 |
| `method` | 否 | `GET` 或 `POST`，默认 `GET` |
| `headers` | 否 | 字符串键值对象，最多 24 项 |
| `body` | 否 | POST 文本，UTF-8 编码不超过 128 KiB |

不能设置 `Host`、`Content-Length`、`Connection`、`Transfer-Encoding` 或 `Proxy-Authorization`。跨域名重定向会移除 `Authorization` 和 `Cookie`；重定向的每个目标都必须符合 `hosts`。单次搜索最多执行 8 次请求，每次请求最多跟随 5 次重定向，连接和读取超时均为 15 秒。请求失败、响应超限或脚本抛错时，本次搜索会失败；应对服务返回的状态码做明确处理。

宿主将以下对象作为 `yield` 表达式的值返回：

```javascript
{
  status: 200,                 // HTTP 状态码
  body: "...",                 // 根据响应字符集解码；未指定时使用 UTF-8
  contentType: "application/json; charset=utf-8" // 服务未提供时此字段可能不存在
}
```

例如，依次查询搜索接口和详情接口：

```javascript
function* search(query) {
  const first = yield { url: "https://api.example.org/search?q=" + encodeURIComponent(query.title) };
  if (first.status !== 200) throw new Error("Search failed");
  const id = JSON.parse(first.body).id;
  const second = yield { url: "https://api.example.org/track/" + encodeURIComponent(id) };
  if (second.status !== 200) throw new Error("Detail failed");
  const track = JSON.parse(second.body);
  return [{ fields: { TITLE: track.title, ARTIST: track.artist } }];
}
```

应遵守数据来源的 API 条款、署名要求和频率限制。不要在脚本中硬编码需要保密的 API 密钥：脚本由用户持有，可以被阅读。

## 返回候选和封面

`search` 最终返回数组，最多 50 项。没有结果时返回 `[]`。

```javascript
return [{
  fields: {
    TITLE: "歌曲名",
    ARTIST: "艺术家",
    ALBUM: "专辑",
    ALBUMARTIST: "专辑艺术家",
    DATE: "2024",
    TRACKNUMBER: "1",
    DISCNUMBER: "1",
    CUSTOM_FIELD: "自定义内容"
  },
  coverUrl: "https://images.example.org/cover.jpg"
}];
```

`fields` 必须是对象，键和值均为字符串。可返回常用字段和自定义字段；字段名不区分大小写，不可出现仅大小写不同的重复名称。每项最多 100 个字段，字段名不超过 128 字符，单个值不超过 100,000 字符，总字段值不超过 512,000 字符，名称和值不能包含 NUL。空白值会被忽略；每个候选至少需要一个非空字段或有效封面地址。只提供封面时使用 `{ fields: {}, coverUrl: "https://..." }`。

`coverUrl` 可省略；提供时必须是声明域名上的 HTTPS 图片地址，最长 4096 字符。建议使用 JPEG 或 PNG，并确保重定向后的域名也已声明。用户选择候选后应用会下载预览，只有用户勾选并应用封面后才会加入编辑内容。不同音频格式和标签块支持的字段及图片类型不同，插件返回字段不代表一定能够写入。

## 运行限制与隐私

| 项目 | 限制 |
| --- | --- |
| 脚本大小 | 最多 256 KiB；文件头结束位置不能超过 8192 字符 |
| JavaScript 内存 / 栈 | 约 32 MiB / 512 KiB |
| 单次启动或恢复执行 | 约 2 秒，网络等待另计；可被用户取消 |
| HTTP 请求 | 每次搜索最多 8 次，文本响应最多 2 MiB |
| 单步 JSON 结果 | 最多 2 Mi 个字符；包含请求描述或候选数据 |
| 封面下载 | 最多 15 MiB |
| 搜索输入 | 歌曲名和艺术家各不超过 200 字符 |

插件运行于独立的 QuickJS 上下文，没有提供直接访问本地音频或应用文件的接口；网络请求由宿主按声明的域名限制执行。这些限制不能消除第三方代码和远程服务的全部风险。应只从可信来源导入脚本，不要在脚本中收集与搜索无关的数据。

## 开发与排查

- 导入失败：检查 UTF-8 编码、文件头 JSON、唯一 ID、域名和 JavaScript 语法；脚本必须定义 `search` 函数。
- 搜索失败：检查生成器写法、状态码、请求次数、响应大小，以及每次请求和重定向的域名。只允许 HTTPS。
- 没有封面：检查候选的 `coverUrl`、图片是否可以公开访问、所有重定向域名以及图片大小和格式。
- 字段无法应用：检查值是否为字符串、字段名是否重复，以及当前文件格式和标签块是否支持该字段。
- 更新插件：保持 `id` 不变并提高 `version`，把新 `.js` 交给用户重新导入确认。修改 ID 会被视为另一个插件。

可用本仓库的 [离线示例测试](../examples/plugins/test-musicbrainz.cjs) 检查示例脚本的生成器交互；它使用模拟响应，不验证线上服务。实际发布前还应在应用内测试导入、真实搜索、重定向、封面预览、字段应用和保存。
