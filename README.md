# 椒盐音频分析开发者文档

这里是椒盐音频分析的开发者接入文档。播放器、文件管理器等 Android 应用可以打开音频分析页面或元数据编辑页面；开发者也可以编写 JavaScript 插件，为用户提供在线元数据和封面来源。

| 我想做什么 | 文档 |
| --- | --- |
| 打开一首音频的分析页面 | [音频分析接入](docs/analysis.md) |
| 打开元数据和封面编辑页面，并接收保存结果 | [元数据编辑接入](docs/metadata-editor.md) |
| 将应用私有文件分享给编辑或分析页面 | [准备音频 URI](docs/sharing-audio.md) |
| 编写、测试和分发在线匹配插件 | [JavaScript 插件开发](docs/metadata-plugins.md) |
| 参考可导入的插件 | [MusicBrainz 示例插件](examples/plugins/musicbrainz.js) |

这些接口不需要集成 SDK。Android 页面通过系统 Intent 调用；插件以 `.js` 文件的形式由用户主动导入。

> 本文档描述包含相应功能的应用构建。外部元数据编辑回调和 JavaScript 插件是新接入能力，旧版本可能尚未支持；具体可用版本请以应用发行说明为准。调用时应处理未安装或不支持的情况。

遇到文档问题或希望提出建议，可以在本仓库的 [Issues](https://github.com/Moriafly/SaltAudioAnalyzerSource/issues) 中反馈。
