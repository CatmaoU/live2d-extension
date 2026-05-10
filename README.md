# Live2D 看板娘浏览器插件

基于 [live2d-widget](https://github.com/stevenjoezhang/live2d-widget) 开发的浏览器扩展，支持 Chrome、Edge 和 Firefox

## 功能

- 支持 Cubism 2 和 Cubism 3 模型
- 兼容 VTS 模型（动作和音效等方面还没做，只是说做到了兼容，可以显示了）

## 安装

详细请看目录下的 BROWSER_SUPPORT.md

## 项目结构

```
live2d-widget-extension/
├── manifest.json       # 扩展配置
├── content.js          # 页面注入脚本
├── background.js       # 后台脚本
├── popup.html/js       # 设置面板
 └── popup2.html/js     # 高级设置
├── dist/               # Live2D 核心文件
├── lemon-tab/          # 新标签页
├── live2d-static-api/  # Cubism 模型索引
 ├── models_Cubism2     # Cubism 2 模型
 └── models_Cubism3     # Cubism 3 模型
├── live2d-moc3/        # Cubism 3 调用库
└── live2d-ai/          # AI 对话功能
```

## 更新日志
### v1.0.4-beta-2
- 修复 Cubism2 本地模型加载问题（兼容-这玩意太老了准备舍弃）
- 修复 settingsData 变量作用域问题
- 在 lemon-tab 默认图标配置中添加 GitHub 和 UAPI 图标

### v1.0.4-beta-1
- AI 聊天功能完善，支持 DeepSeek 和硅基流动 API
- 添加角色信息配置（姓名、喜欢、关系、角色设定、限制）
- 点击模型触发抚摸交互（挠你、摸摸、捏捏等）
- 从 `live2d-ai/json/` 文件夹自动读取 API Key 和角色配置
- 添加连接状态显示和自动重连功能
- 输入框支持亮色/暗色主题
- 优化设置同步机制

### v1.0.3-alpha
- 模型大小滑块实时更新，无需刷新页面
- 修复Cubism2模型拖拽功能
- 添加拖拽位置保存功能
- 添加拖拽限位，防止拖出屏幕
- 气泡位置智能调整（根据模型原始位置和拖拽位置）
- 主题切换优化（支持亮色/暗色/跟随系统主题）
- 添加齿轮设置按钮，跳转高级设置页面
- AI聊天功能框架搭建（待实现）
- UI优化和修复

### v1.0.2-alpha-2
- 添加了鼠标点击特效
- 增加了鼠标样式（动态为实现）
- 添加鼠标项

### v1.0.2-alpha-1
- 添加 Cubism2 点击触发一言功能
- 优化 Cubism2 主题切换按钮样式
- Cubism3 添加悬浮窗功能
- 缩小悬浮窗 50%
- 修复多次开关悬浮窗的位移问题

### v1.0.1-alpha
- 新增 Firefox 浏览器支持
- 新增亮色/暗色主题切换
- 优化气泡位置和定位

### v1.0.0-alpha-2
- 完善浏览器 API 兼容层
- 重写UI界面

### v1.0.0-alpha-1 - 初始版本发布
- 支持 Chrome 和 Edge 浏览器
- 支持 Cubism 2 和 Cubism 3 模型
- 基础看板娘功能

## 后续

-修bug（修bug修的想死，拖着吧）

## 许可证

GPL-3.0
