# 大广赛互动类 WebAR 基础正式版

这是一个基于 MindAR + A-Frame + 静态网页制作的移动端 WebAR 互动作品基础版。

当前命题方向已经固定为：

```text
泡泡玛特 Zsiga「生来自由，倔强生长」
```

当前页面不是“开发版识别卡”演示，而是已经使用泡泡玛特官方竖版海报作为正式识别图的作品基础版。

## 当前体验流程

```text
扫码进入网页
  ↓
允许摄像头权限
  ↓
对准泡泡玛特 Zsiga 官方竖版海报
  ↓
识别成功后出现 AR 内容
  ↓
点击“开盒 / 刺刺 / 能量 / 抽盒”
  ↓
获得开学情绪卡并截图分享
```

## 当前已经完成

- 官方竖版海报已替换为正式识别图：`assets/marker-card.png`
- `assets/targets.mind` 已重新生成并可用于真实识别
- 页面支持摄像头识别与 AR 叠加
- 底部按钮已切换为 `开盒 / 刺刺 / 能量 / 抽盒`
- 四张 AR 卡片已改成泡泡玛特 Zsiga 在开学季传播节点下的基础正式版视觉

## 项目结构

- `index.html`：移动端 WebAR 页面
- `assets/marker-card.png`：正式识别图，当前为泡泡玛特官方竖版海报
- `assets/marker-card.svg`：识别图预览包装文件
- `assets/targets.mind`：MindAR 识别文件
- `assets/popmart-logo.png`：泡泡玛特官方 Logo
- `assets/ar-object-main.svg`：开盒层 AR 视觉
- `assets/ar-object-story.svg`：刺刺层 AR 视觉
- `assets/ar-object-feature.svg`：能量层 AR 视觉
- `assets/ar-object-reward.svg`：抽盒层 AR 视觉
- `docs/popmart-zsiga-concept.md`：作品创意方案
- `docs/demo-video-script.md`：演示视频脚本
- `docs/test-record.md`：当前测试记录
- `docs/feasibility-conclusion.md`：技术路线结论
- `docs/deploy-and-qr.md`：HTTPS 与二维码说明

## 本地运行

在项目目录运行：

```bash
python -m http.server 8080
```

然后打开：

```text
http://localhost:8080
```

## 识别图与 targets.mind

当前正式识别图固定为：

```text
assets/marker-card.png
```

它和最终识别文件一一对应：

```text
assets/targets.mind
```

如果未来再改识别图的文案、Logo、构图或角色位置，就需要重新编译新的 `targets.mind`。

## 现在的下一步

当前基础正式版已经成形。接下来建议继续完善：

1. 给“抽盒”层接入真实的泡泡抽盒机入口，或准备提交版导流说明。
2. 部署 HTTPS 页面并生成二维码。
3. 做 iPhone Safari / Android Chrome 真机复测。
4. 录制 60-90 秒演示视频。

## 备注

项目里仍保留了 `scripts/generate_marker_png.py`，它是早期临时识别卡脚本。当前版本不建议再运行它覆盖正式识别图。
