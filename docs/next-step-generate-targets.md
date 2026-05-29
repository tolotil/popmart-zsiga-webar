# 识别图与 targets.mind 说明

现在项目已经把泡泡玛特官方竖版海报固定为正式识别图。要让手机摄像头真正识别这张图，需要生成：

```text
assets/targets.mind
```

## 编译规则

MindAR 不是直接拿 PNG 做识别。它需要先把识别图分析成一个目标文件，也就是 `.mind` 文件。

当前项目里，正式识别图是：

```text
assets/marker-card.png
```

当前这张 `marker-card.png` 已经切换为泡泡玛特官方竖版海报，所以你编译它之后，手机最终识别的也就是这张海报。

## 编译步骤

1. 打开 MindAR Image Targets Compiler。
2. 上传：

```text
assets/marker-card.png
```

3. 点击编译。
4. 下载生成的 `.mind` 文件。
5. 把它重命名为：

```text
targets.mind
```

6. 放到：

```text
assets/targets.mind
```

7. 刷新 `http://localhost:8080`。

如果页面顶部提示变成“允许摄像头权限，然后把手机对准官方竖版海报”，就说明已经进入真实 AR 模式。

## 使用方式

打开正式识别图：

```text
assets/marker-card.png
```

用另一台设备显示，或者打印出来。然后用手机打开网页，对准这张官方竖版海报。

## 注意

- 编译完成后，尽量不要再改 `assets/marker-card.png` 的文案、构图、Logo 位置和角色位置。
- 如果改了识别图，就要重新编一次 `targets.mind`。
- 手机真实测试最好使用 HTTPS。
- 如果识别慢，优先优化识别图稳定性，而不是先改页面代码。
