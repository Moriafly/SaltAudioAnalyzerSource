# 调用音频分析页面

通过 Android 标准 Intent，可以把一首音频交给椒盐音频分析，直接进入分析详情页并查看频谱。此接口只打开页面，不返回分析数据，也不表示分析已完成。

## 接口约定

| 项目 | 值 |
| --- | --- |
| 应用包名 | `com.xuncorp.saltaudioanalyzer` |
| 指定应用打开 | `android.intent.action.VIEW`，在 `data` 中传入 URI |
| 系统分享 | `android.intent.action.SEND`，在 `Intent.EXTRA_STREAM` 中传入 URI |
| 接收内容 | 一首 `content://` 音频，URI 必须有 authority |
| MIME 类型 | `audio/*` 或具体音频类型；也接受 `application/ogg` 和 `application/x-ogg` |
| URI 授权 | `FLAG_GRANT_READ_URI_PERMISSION` |

接口不接收 `file://`、本地路径、网络 URL 或 `ACTION_SEND_MULTIPLE`。MIME 类型用于匹配入口，并不保证文件的容器或编码可被读取。被分享的 URI 必须可以由调用方转授读取权限，且在用户查看期间仍然有效。

## 指定椒盐音频分析打开

下面的 `audioUri` 可以来自媒体库或调用方自己的 `FileProvider`。若已知具体 MIME 类型，可以传入 `audio/flac`、`audio/mpeg` 等；不知道具体类型但确定是音频时使用 `audio/*`。

```kotlin
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri

private const val SALT_AUDIO_PACKAGE = "com.xuncorp.saltaudioanalyzer"

fun openAudioAnalysis(
    context: Context,
    audioUri: Uri,
    mimeType: String = "audio/*",
): Boolean {
    require(audioUri.scheme == "content" && !audioUri.authority.isNullOrBlank())
    val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(audioUri, mimeType)
        setPackage(SALT_AUDIO_PACKAGE)
        clipData = ClipData.newRawUri("audio", audioUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        if (context !is Activity) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    return try {
        context.startActivity(intent)
        true
    } catch (_: ActivityNotFoundException) {
        false // 未安装或当前版本不支持该入口
    } catch (_: SecurityException) {
        false // 检查 URI 是否可由调用方转授
    }
}
```

在用户主动操作时调用。例如，播放器可以在歌曲菜单中添加“分析音频”。返回 `true` 仅表示系统接受了启动请求。不要固定目标 Activity 类名，接入约定是 action、包名、URI、MIME 类型与授权。

## 通过系统分享

```kotlin
import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri

fun shareAudioForAnalysis(activity: Activity, audioUri: Uri, mimeType: String = "audio/*") {
    require(audioUri.scheme == "content" && !audioUri.authority.isNullOrBlank())
    val send = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, audioUri)
        clipData = ClipData.newRawUri("audio", audioUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    activity.startActivity(Intent.createChooser(send, null))
}
```

用户在分享面板中选择椒盐音频分析。接收端优先读取 `EXTRA_STREAM`，没有该字段时读取 `ClipData` 的第一项。调用方还应处理无法转授 URI 时的 `SecurityException`。

## 文件和权限

如果音频位于应用私有目录，请配置 [`FileProvider`](https://developer.android.com/training/secure-file-sharing/setup-sharing) 并共享它生成的 URI，不能跨应用传递 `Uri.fromFile()`。配置和代码示例见[准备音频 URI](sharing-audio.md)。调用方需要保留对应文件和权限；删除缓存文件或提前撤销授权会使分析失败。

分析可能多次打开并读取文件，可重复打开、支持随机定位的来源体验更好。云端或一次性流可能较慢，或因来源限制而无法分析；可以先准备可共享的本地副本。无法读取时，请检查 URI 授权、源文件、格式和设备的解码能力。

如果需要在启动前查询应用是否可见，可在调用方的 `AndroidManifest.xml` 中声明：

```xml
<queries>
    <package android:name="com.xuncorp.saltaudioanalyzer" />
</queries>
```

预查询不能代替启动时的异常处理，安装状态也不代表入口一定可用。有关系统行为可参阅 [Android 音频 Intent](https://developer.android.com/guide/components/intents-common#Music) 和 [应用可见性](https://developer.android.com/training/package-visibility/use-cases)。
