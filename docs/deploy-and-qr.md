# 部署 HTTPS 和生成二维码

WebAR 真机测试最好使用 HTTPS。没有 HTTPS 时，手机浏览器可能不允许摄像头权限。

## 推荐部署方式

任选一种：

- Vercel
- Netlify
- GitHub Pages
- Gitee Pages
- 学校服务器
- 阿里云 OSS / 腾讯云 COS 静态网站

如果主要在国内展示，优先考虑学校服务器、Gitee Pages、阿里云 OSS 或腾讯云 COS。

## 需要上传的文件

部署时至少包含：

```text
index.html
assets/
  targets.mind
  marker-card.png
  marker-card.svg
  popmart-logo.png
  ar-object-main.svg
  ar-object-story.svg
  ar-object-feature.svg
  ar-object-reward.svg
```

`docs/` 和 `scripts/` 不一定要部署，它们是制作与说明材料。

## 部署后要检查

打开线上链接，确认：

- 页面可以打开。
- 顶部提示进入真实 AR 模式。
- 手机浏览器能请求摄像头权限。
- 对准泡泡玛特官方竖版海报可以识别。
- 底部按钮可以切换内容。

## 二维码

拿到线上 HTTPS 链接后，把链接生成二维码。二维码可以放在：

- 官方竖版海报旁边。
- 作品说明页。
- 展示海报。
- 演示视频开头。

二维码旁边建议写：

```text
扫码打开 AR 互动体验
```
