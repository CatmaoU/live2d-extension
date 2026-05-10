# 浏览器支持说明（注意这是Ai写的不保证正确，请自己观察）

本扩展支持以下浏览器：

## 支持的浏览器

✅ **Chrome** - 版本 88 及以上
✅ **Edge** - 版本 88 及以上
✅ **Firefox** - 版本 109 及以上

## 各浏览器安装方法

### Chrome / Edge 安装方法

1. 打开浏览器，访问 `chrome://extensions/` 或 `edge://extensions/`
2. 启用右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `live2d-widget-extension` 文件夹
5. 完成！

### Firefox 安装方法（重要！）

Firefox 有安全限制，未签名扩展默认无法直接安装。请使用以下方法之一：

#### 方法一：临时加载（推荐开发使用）
1. 打开 Firefox，访问 `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择 `live2d-widget-extension` 文件夹中的 `manifest.json` 文件
4. 完成！

⚠️ **注意**：
- Firefox 临时扩展在浏览器关闭后会失效，需要重新加载
- 每次打开浏览器都需要重新加载

#### 方法二：使用 Firefox Developer Edition
1. 下载 Firefox Developer Edition
2. 在地址栏输入 `about:config`
3. 搜索 `xpinstall.signatures.required`，设置为 `false`
4. 然后就可以像Chrome一样直接加载了

#### 方法三：打包成 xpi 文件（临时使用）
1. 将扩展文件夹压缩为 zip 格式
2. 将扩展名从 .zip 改为 .xpi
3. 拖放到 Firefox 浏览器窗口中
4. 注意：这样安装的扩展在重启后会被禁用

#### 方法四：提交到 Firefox Add-ons Store（推荐正式使用）
1. 访问 https://addons.mozilla.org/developers/
2. 注册开发者账号
3. 提交扩展进行签名
4. 审核通过后就可以正式安装了


### Chrome / Edge 特点
- 原生支持 Manifest V3
- 完全支持 Trusted Script URL
- 最佳性能和稳定性
- 开发者模式加载简单

### Firefox 特点
- Manifest V3 完整支持（Firefox 109+）
- 扩展 ID: `live2d-widget@example.com`
- 安全要求更高，需要签名
- 支持临时加载用于开发

## 常见问题

### Firefox 中扩展无法加载
- 确保使用 Firefox 109 或更高版本
- 检查是否正确选择了 manifest.json 文件
- 确认是在 about:debugging 页面加载