# 调用元数据和封面编辑页面

调用方通过 `ACTION_EDIT` 传入一首音频，用户可以在椒盐音频分析中编辑元数据和封面，并选择覆盖原文件或另存为。保存完成后页面关闭，Android 将结果返回给调用方。

需要安装**包含此入口的应用构建**；已安装的旧版本可能只支持分析页面，不能因此假定也支持编辑。请处理 `ActivityNotFoundException`。

## 接口约定

| 项目 | 值 |
| --- | --- |
| 应用包名 | `com.xuncorp.saltaudioanalyzer` |
| Action | `android.intent.action.EDIT` |
| Data | 一首具有 authority 的 `content://` 音频 URI |
| MIME 类型 | `audio/*` 或具体音频类型；也接受 `application/ogg` 和 `application/x-ogg` |
| 输入权限 | `FLAG_GRANT_READ_URI_PERMISSION`；需要覆盖原文件时还需 `FLAG_GRANT_WRITE_URI_PERMISSION` |
| 成功结果 | `Activity.RESULT_OK`，结果 Intent 的 `data` 是实际保存的 URI |
| 保存方式 | 布尔 extra `com.xuncorp.saltaudioanalyzer.extra.SAVED_AS_COPY`：`true` 为另存为，`false` 为覆盖原文件 |
| 取消或未完成 | `Activity.RESULT_CANCELED`；不应从中读取成功结果 |

不支持 `file://`、文件路径、网络 URL、多文件或仅通过 `EXTRA_STREAM` 传入文件。是否能够编辑取决于文件格式、来源的读写能力和用户选择；MIME 类型本身不代表一定可写。

## Kotlin 示例

示例使用 AndroidX Activity Result API。注册回调要放在 Activity 或 Fragment 每次创建时都会执行的位置；请不要在点击事件内部注册。

```kotlin
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : ComponentActivity() {
    private val editAudio = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK) {
            // 用户取消或没有完成保存；按自己的界面需要处理
            return@registerForActivityResult
        }
        val resultIntent = result.data ?: return@registerForActivityResult
        val savedUri = resultIntent.data ?: return@registerForActivityResult
        val savedAsCopy = resultIntent.getBooleanExtra(
            "com.xuncorp.saltaudioanalyzer.extra.SAVED_AS_COPY", false
        )

        // savedUri 是实际写入的文件。重新读取它的标签并刷新本地缓存
        // savedAsCopy 为 true 时，原文件和新文件是两个不同的文件
        onAudioSaved(savedUri, savedAsCopy)
    }

    fun openMetadataEditor(audioUri: Uri, mimeType: String = "audio/*") {
        require(audioUri.scheme == "content" && !audioUri.authority.isNullOrBlank())
        val intent = Intent(Intent.ACTION_EDIT).apply {
            setDataAndType(audioUri, mimeType)
            setPackage("com.xuncorp.saltaudioanalyzer")
            clipData = ClipData.newRawUri("audio", audioUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
        try {
            editAudio.launch(intent)
        } catch (_: ActivityNotFoundException) {
            // 提示安装或更新椒盐音频分析
        } catch (_: SecurityException) {
            // 调用方无权转授请求的 URI 权限
        }
    }

    private fun onAudioSaved(uri: Uri, savedAsCopy: Boolean) {
        // 在这里更新播放器或文件列表
    }
}
```

用 Activity Result API 从 Activity 或 Fragment 发起调用。需要回调时不要添加 `FLAG_ACTIVITY_NEW_TASK`、`FLAG_ACTIVITY_SINGLE_TOP` 或 `FLAG_ACTIVITY_CLEAR_TOP`：它们可能使系统复用已有页面或立即返回取消，无法把这次结果可靠地关联到调用方。如果应用允许同时处理多个编辑请求，应由调用方维护请求与歌曲的对应关系，并在界面重建后恢复需要的信息。

如果系统将新的打开请求交给正在编辑元数据的已有页面，椒盐音频分析会提示先结束当前编辑，以保护未保存的修改；调用方可在用户完成当前操作后再次发起请求。

## 结果与权限

- **覆盖原文件：** 编辑器写入并校验成功后返回原 URI，`SAVED_AS_COPY` 为 `false`。调用方应重新读取元数据，不能仅依赖之前的缓存。
- **另存为：** 用户在系统文件选择器中选择目录；新文件写入并校验成功后返回新 URI，`SAVED_AS_COPY` 为 `true`。原 URI 仍指向原文件。返回的 Intent 附带临时读取授权；能否进一步共享或长期访问仍取决于目标文档提供方和系统授权。需要长期保留时，请及时复制到调用方自己的存储，或由用户重新授权。
- **取消、未保存、文件不受支持或保存失败：** 不返回成功结果。失败时编辑器会提示用户，允许用户处理或退出。`RESULT_CANCELED` 不包含详细错误码；在进程中断或存储故障等情况下，也不能仅凭取消结果推断文件一定没有变化。

编辑入口不会自动保存。覆盖原文件需要用户在编辑器中确认；另存为由用户选择目标。原文件必须允许可重复读取；如需覆盖，提供方还必须允许随机或完整写入。调用方使用 `FileProvider` 时，需要共享实际可写的文件，并授予读写 URI 权限；仅为临时播放准备的只读流通常不能被覆盖。

如果要共享应用私有目录中的文件，见 [FileProvider 配置与 URI 示例](sharing-audio.md)。如果共享的是缓存副本，覆盖操作只会修改该副本；调用方需要根据自己的数据模型处理副本和原文件。

对只读来源，调用方可以仅授予读取权限并由用户选择另存为。此时将示例中的标志改为 `FLAG_GRANT_READ_URI_PERMISSION`；覆盖操作可能被拒绝。文档提供方、系统版本和文件的具体权限会影响结果。

参考：[获取 Activity 结果](https://developer.android.com/training/basics/intents/result)、[安全共享文件](https://developer.android.com/training/secure-file-sharing)、[应用可见性](https://developer.android.com/training/package-visibility/use-cases)。
