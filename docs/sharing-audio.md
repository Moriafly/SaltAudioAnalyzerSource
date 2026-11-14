# 准备可共享的音频 URI

分析和编辑入口都使用 `content://` URI。如果音频已经由媒体库或文档提供方提供，可以在调用方有权转授时直接使用。对于应用私有目录中的文件，可以通过 AndroidX `FileProvider` 生成 URI。下面的例子只暴露 `cacheDir/shared_audio/` 目录。

## 配置 FileProvider

调用方需要依赖 AndroidX Core，并定义一个子类：

```kotlin
import androidx.core.content.FileProvider

class AudioShareProvider : FileProvider()
```

在**调用方应用**的 `AndroidManifest.xml` 中添加：

```xml
<application ...>
    <provider
        android:name=".AudioShareProvider"
        android:authorities="${applicationId}.audio-share"
        android:exported="false"
        android:grantUriPermissions="true">
        <meta-data
            android:name="android.support.FILE_PROVIDER_PATHS"
            android:resource="@xml/audio_share_paths" />
    </provider>
</application>
```

根据子类实际包名调整 `android:name`。在调用方的 `res/xml/audio_share_paths.xml` 中声明允许共享的目录：

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="shared_audio" path="shared_audio/" />
</paths>
```

将音频准备到该目录后生成 URI：

```kotlin
import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File

fun sharedAudioUri(context: Context, audioFile: File): Uri =
    FileProvider.getUriForFile(
        context,
        "${context.packageName}.audio-share",
        audioFile,
    )

fun exampleUri(context: Context): Uri {
    // 调用前先由应用把实际音频写入该文件
    val audioFile = File(context.cacheDir, "shared_audio/song.flac")
    require(audioFile.isFile)
    return sharedAudioUri(context, audioFile)
}
```

`FileProvider` 只接受配置目录内的文件；文件必须已存在且在目标应用读取期间保持可用。使用缓存时，请避免在用户编辑或分析期间清理它。不要向其他应用发送 `file://` URI 或应用私有路径。

## 选择读写授权

调用[分析页面](analysis.md)时，给 Intent 添加 `FLAG_GRANT_READ_URI_PERMISSION`。调用[编辑页面](metadata-editor.md)并允许覆盖时，同时添加 `FLAG_GRANT_WRITE_URI_PERMISSION`。授权标志不会让本身只读的文件或只读提供方变为可写；调用方也不能授予自己没有的权限。

`FileProvider` 在被授权后可为受支持的文件提供读写访问。若共享的是缓存副本，覆盖编辑修改的是副本，不会自动修改原始歌曲；如果应用要同步回原位置，应由调用方自行处理。对于只读来源，可以只授予读取权限并让用户另存为。

文档提供方可能限制重复打开、随机定位、写入或转授；如果共享失败，请先确认提供方的能力、调用方持有的权限，以及 URI 在操作期间没有失效。另存为返回的新 URI 可能属于另一个提供方，不能假定它与传入 URI 具有相同权限。

参考：[Android 安全共享文件](https://developer.android.com/training/secure-file-sharing)、[FileProvider](https://developer.android.com/reference/androidx/core/content/FileProvider)。
