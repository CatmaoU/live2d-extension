# Live2D 看板娘浏览器插件
## 示例

![示例截图1](https://raw.githubusercontent.com/CatmaoU/live2d-extension/main/dist/README/1.png)

![示例截图2](https://raw.githubusercontent.com/CatmaoU/live2d-extension/main/dist/README/2.png)


基于 [live2d-widget](https://github.com/stevenjoezhang/live2d-widget) 开发的浏览器扩展，支持 Chrome、Edge 和 Firefox

## 功能

- 支持 Cubism 2 和 Cubism 3 模型
- 兼容 VTS 模型（兼容了部分动作和音效）

## 安装

详细请看 [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md)

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
### v1.0.8
- GitHub 定向代理：支持 codeload.github.com 下载加速、自定义代理节点
- 域名过滤：白名单/黑名单模式，支持路径细分（如 `bilibili.com/video`），独立列表存储
- 暗色主题适配：全局滚动条、分页箭头、冻结模型下拉菜单、域名过滤弹窗、数字输入框
- 模型大小：碰撞箱/红框随缩放同步（通过 deviceToScreen 矩阵更新）
- AI 心跳检测：可配置检测间隔（默认 60 秒），连接异常时自动标记断开
- 模型参数面板：选项重排（触摸→动作→点击区域→声音），音量即时开关 + 动态调整
- UI 改进：分页标题（插件相关 / AI 相关）、按钮样式统一（action-btn）、模型大小换行标签
- 修复：手动切换主题时关闭跟随系统主题、分页箭头不明显、音量 100 显示不全、声音滑块溢出等
- 移除：废弃的"呆在全部位置"按钮和提示

### v1.0.7
- 目前兼容了 HitArea 点击区域检测
- 支持 VTS 自定义 model.json 的点击交互
- 添加 Alt 键悬停隐藏模型下方按钮和输入框
- build.js 合并自定义 model.json 的 Motions/Expressions/HitAreas
- 修复 model3.json 中 null File 条目导致的 NullValue 加载错误
- 修改模型排序|模型下拉列表按名字长度 + 拼音排序
- 修复了一些小BUG（如模型渲染问题、内存统计不准确、冻结模型功能失效等..）

### v1.0.6
- 按键映射系统：支持 Cubism3 模型表情/动作快捷键
- 默认 30 键映射（小键盘 0-9/*/-/+ + 主键盘 0-9/-=[]\\;\',./）
- 小键盘与主键盘独立区分（可分别绑定不同动作）
- 表情独立叠加模式：每个表情可独立开关，多表情参数合并
- 表达式去重（按 file 字段），修复 model3.json 重复条目
- 修复表情文件名（Expressions_.json → Expressions_0.json）
- 水印参数内建注入：build 时检测 expression13 参数并注入到所有表情
- 表情恢复逻辑完善：刷新页面后通过 setExpression + setParameterById 双重恢复
- 构建工具 v1.0.4：自动修复表情文件名匹配 model.json 引用
- 修复按键气泡提示与映射列表不一致
- 修复缓存与运行时顺序不同步
- 修复 Zenless 和 Honkai 系列模型 Expression 文件路径不匹配
- 迁移至 v1.0.6 正式版

### v1.0.5-beta-2
- 页面总结问答系统：三步回答机制（总结→页面原文检索→DuckDuckGo 网络搜索）
- 段落引用标注 @数字，点击跳转到网页对应段落并高亮
- AI 回复面板代码块渲染（深色边框 + 语言标签 + 右上角复制按钮）
- 代码块语法高亮（键名蓝色、字符串绿色、数字橙色、关键字紫色）
- AI 回复面板聊天输入框 + 「发送」按钮交互
- 集成 DuckDuckGo Instant Answer API 自动搜索补充回答
- 限制段落标注数量不超过 2 处，避免回答被大量@标签淹没
- 支持 @P12-P15 多种段落标注格式

### v1.0.5-beta-1
- 新增「涩涩」功能：通过关键词（不告诉你）
- 修复 CSP 限制问题：改用 `<img>` 直链 + 302 重定向，无需任何 bridge/background 桥接
- 每日一图 / 色图添加时间戳防缓存参数
- 优化 `showImageInTips` 图片加载检测（`naturalWidth` 轮询）
- 添加每日一图
- 添加页面长截图

### v1.0.4-beta-2
- 修复 Cubism2 本地模型加载问题（兼容-这玩意太老了准备舍弃）
- 修复 settingsData 变量作用域问题
- 在 lemon-tab 默认图标配置中添加部分默认图标

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

- 修bug（修bug修的想死，拖着吧）

## !声明!
- 未经允许禁止将模型二次打包转卖免费模型，一旦贩卖发生纠纷请自行解决
- 本项目参考了大部分开源项目并且基于ai辅组下完成，如有侵权我会立即删除

## 许可证

GPL-3.0
