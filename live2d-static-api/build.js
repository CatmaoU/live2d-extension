const fs = require('fs/promises')
const path = require('path').posix

// 支持命令行参数：node build.js fromBasePath=models toBasePath=indexes isCompress=false
const buildOptions = setBuildOptions({
  fromBasePath: 'models', // 模型文件夹，只读不写
  toBasePath: 'indexes', // 索引文件夹，每次 build 完全重建
  isCompress: false
})
const fromBasePath = buildOptions.fromBasePath
const toBasePath = buildOptions.toBasePath
const isCompress = buildOptions.isCompress

const modelTemplateJsonFileName = 'model.json'
const modelTexturesFolderPath = 'textures'

const modelsIndexJsonFileName = 'models.json'
const textureDefaultJsonFileName = 'default.json'
const texturesIndexJsonFileName = 'textures.json'
const modelsNameJsonFileName = 'models_name.json'

// 检测字符串是否包含中文
function containsChinese(str) {
  return /[\u4e00-\u9fa5]/.test(str)
}

// 自动修复中文文件名问题 - 创建英文命名的 .model3.json 副本
async function fixChineseModel3Json(modelPath, modelName) {
  const englishModel3Path = `${modelPath}/${modelName}.model3.json`
  const dirents = await fs.readdir(modelPath, { encoding: 'utf-8' })
  const chineseModel3Files = dirents.filter(f => f.endsWith('.model3.json') && containsChinese(f))
  
  if (chineseModel3Files.length > 0) {
    const chineseModel3Path = `${modelPath}/${chineseModel3Files[0]}`
    try {
      await fs.access(englishModel3Path)
      // 英文文件已存在，检查是否需要更新
      const englishStat = await fs.stat(englishModel3Path)
      const chineseStat = await fs.stat(chineseModel3Path)
      if (chineseStat.mtime > englishStat.mtime) {
        console.log(`检测到中文 .model3.json 有更新，同步到 ${modelName}.model3.json`)
        const content = await fs.readFile(chineseModel3Path, 'utf-8')
        await fs.writeFile(englishModel3Path, content, 'utf-8')
      }
    } catch {
      // 英文文件不存在，复制中文文件
      console.log(`检测到中文文件名问题，自动创建 ${modelName}.model3.json`)
      const content = await fs.readFile(chineseModel3Path, 'utf-8')
      await fs.writeFile(englishModel3Path, content, { encoding: 'utf-8', flag: 'w' })
      console.log(`已创建 ${modelName}.model3.json`)
    }
  }
}

class Helper {
  static async ensureExistFolder(folderPath) {
    try {
      await fs.stat(folderPath)
    } catch (e) {
      await fs.mkdir(folderPath, { recursive: true })
      console.warn(`已新建 ${folderPath}`)
    }
  }

  static async deleteFolder(folderPath) {
    try {
      const stat = await fs.stat(folderPath)
      if (!stat.isDirectory()) {
        console.warn(`${folderPath} 不是文件夹`)
        return
      }
    } catch {
      return
    }

    await fs.rm(folderPath, { recursive: true, maxRetries: 5 })
    console.log(`已删除 ${folderPath}`)
  }

  static stringify(json) {
    return JSON.stringify(json, null, isCompress ? '' : '\t')
  }

  static factorial(rest, result = [], detail = []) {
    if (rest.length === 0) {
      result.push(detail)
      return result
    }

    const current = rest[0]
    const newRest = rest.slice(1)

    current.forEach(currentSub => {
      Helper.factorial(newRest, result, [...detail, currentSub])
    })

    return result
  }
}

class Setting {
  static updateModel(fromModelPath, toModelPath, json) {
    if (json.model) {
      json.model = path.relative(toModelPath, path.normalize(`${fromModelPath}/${json.model}`))
    }
  }

  static updatePose(fromModelPath, toModelPath, json) {
    if (json.pose) {
      json.pose = path.relative(toModelPath, path.normalize(`${fromModelPath}/${json.pose}`))
    }
  }

  static updatePhysics(fromModelPath, toModelPath, json) {
    if (json.physics) {
      json.physics = path.relative(toModelPath, path.normalize(`${fromModelPath}/${json.physics}`))
    }
  }

  static updateExpressions(fromModelPath, toModelPath, json) {
    if (json.expressions) {
      json.expressions.forEach(({ file }, index, array) => {
        array[index].file = path.relative(toModelPath, path.normalize(`${fromModelPath}/${file}`))
      })
    }
  }

  static updateMotions(fromModelPath, toModelPath, json) {
    if (json.motions) {
      Object.values(json.motions).forEach(groups => {
        groups.forEach((motion, index, array) => {
          if (motion.file) {
            array[index].file = path.relative(toModelPath, path.normalize(`${fromModelPath}/${motion.file}`))
          }
          if (motion.sound) {
            array[index].sound = path.relative(toModelPath, path.normalize(`${fromModelPath}/${motion.sound}`))
          }
        })
      })
    }
  }

  static updateTextures(fromModelPath, toModelPath, json, textures = []) {
    json.textures = textures.map(texture => {
      return path.relative(toModelPath, path.normalize(`${fromModelPath}/${texture}`))
    })
  }
}

init()

async function init() {
  // 不再删除 indexes，仅确保目录存在
  await Helper.ensureExistFolder(toBasePath)

  // 先更新模型分类文件
  await updateModelCategoriesJsonFile()

  const modelPaths = await createModelsIndexJsonFile()
  
  await createModelsNameJsonFile(modelPaths)

  for (const { modelPath, isCubism3, sourceFolder } of modelPaths) {
    const fromModelPath = `${sourceFolder}/${modelPath}`
    const toModelPath = `${toBasePath}/${modelPath}`

    // 检查是否已存在索引，跳过已生成的
    const indexExists = await fs.access(`${toModelPath}/default.json`).then(() => true).catch(() => false)
    if (indexExists) {
      console.log(`跳过已存在：${modelPath}`)
      continue
    }

    console.log(`生成索引：${modelPath}${isCubism3 ? ' (Cubism 3格式)' : ''}`)

    await Helper.ensureExistFolder(toModelPath)

    if (isCubism3) {
      await createCubism3ModelJson(fromModelPath, toModelPath)
    } else {
      await createTextureJsonFiles(fromModelPath, toModelPath)
      await createTexturesIndexJsonFile(toModelPath)
    }

    console.log(`  完成：${modelPath}`)
  }

  // 扫描所有模型目录中的动作/表情文件，生成动作索引
  console.log(`\n开始扫描动作/表情文件...`)
  const watermarkedModels = new Set()
  for (const { modelPath, sourceFolder } of modelPaths) {
    const fromModelPath = `${sourceFolder}/${modelPath}`
    const toModelPath = `${toBasePath}/${modelPath}`
    try {
      const dirents = await fs.readdir(fromModelPath, { withFileTypes: true })
      const actions = []
      for (const dirent of dirents) {
        if (dirent.isFile()) {
          const name = dirent.name
          if (name.endsWith('.motion3.json')) {
            // .motion3.json 不映射到按键列表（VTS 专用，标准 SDK 无法渲染）
          } else if (name.endsWith('.exp3.json')) {
            actions.push({ type: 'expression', file: name })
          }
        }
      }
      // 检测水印去除表情（expression13），将其参数注入所有其他 .exp3.json
      let watermarkParams = null
      try {
        const wmFile = `${fromModelPath}/expression13.exp3.json`
        await fs.access(wmFile)
        const wmContent = JSON.parse(await fs.readFile(wmFile, 'utf-8'))
        if (wmContent.Parameters && wmContent.Parameters.length > 0) {
          watermarkParams = wmContent.Parameters
          watermarkedModels.add(modelPath)
          console.log(`   ${modelPath}: 检测到水印去除参数 (${watermarkParams.length}个)，注入到其他表情中`)
        }
      } catch (e) {}
      if (watermarkParams) {
        for (const dirent of dirents) {
          if (!dirent.isFile()) continue
          const name = dirent.name
          if (!name.endsWith('.exp3.json') || name === 'expression13.exp3.json') continue
          try {
            const filePath = `${fromModelPath}/${name}`
            let content = JSON.parse(await fs.readFile(filePath, 'utf-8'))
            if (!content.Parameters) content.Parameters = []
            // 去重合并：只添加水印去重中不存在于原表情的参数
            const existingIds = new Set(content.Parameters.map(p => p.Id))
            for (const wp of watermarkParams) {
              if (!existingIds.has(wp.Id)) {
                content.Parameters.push(wp)
              }
            }
            await fs.writeFile(filePath, Helper.stringify(content))
            console.log(`     ← 注入 ${name}`)
          } catch (e) {}
        }
      }
      if (actions.length > 0) {
        // 重新读取目录（因为文件可能已被修改），生成 actions_index.json
        const updatedDirents = await fs.readdir(fromModelPath, { withFileTypes: true })
        const updatedActions = []
        for (const ud of updatedDirents) {
          if (ud.isFile()) {
            if (ud.name.endsWith('.motion3.json')) { /* 不映射 motion */ }
            else if (ud.name.endsWith('.exp3.json')) updatedActions.push({ type: 'expression', file: ud.name })
          }
        }
        await fs.writeFile(`${toModelPath}/actions_index.json`, Helper.stringify(updatedActions))
        console.log(`   ${modelPath}: 发现 ${updatedActions.length} 个动作/表情文件`)
      }
    } catch (e) {}
  }

  // 生成按键映射缓存文件（按来源/游戏 → 角色 → actions_cache.json）
  console.log(`\n生成按键映射缓存文件...`)
  const cacheDir = 'assets'
  let cacheCount = 0
  for (const { modelPath, sourceFolder } of modelPaths) {
    const fromModelPath = `${sourceFolder}/${modelPath}`
    const toModelPath = `${toBasePath}/${modelPath}`
    let allActs = []
    // 从 model.json / .model3.json 读取注册的动作
    let modelConfig = null
    try { modelConfig = JSON.parse(await fs.readFile(`${fromModelPath}/model.json`, 'utf-8')) } catch(e) {}
    if (!modelConfig) {
      const modelName = modelPath.split('/').pop()
      try { modelConfig = JSON.parse(await fs.readFile(`${fromModelPath}/${modelName}.model3.json`, 'utf-8')) } catch(e) {}
    }
    if (modelConfig && modelConfig.FileReferences) {
      // FileReferences.Motions 不映射到按键列表
      if (modelConfig.FileReferences.Expressions) {
        var expSeen = {};
        modelConfig.FileReferences.Expressions.forEach(function(e) {
          var ek = e.File || e.Name;
          if (!expSeen[ek]) {
            expSeen[ek] = true;
            var ename = e.Name;
            if (/^\d+$/.test(ename)) ename = 'expression' + ename;
            allActs.push({ type: 'expression', name: ename, file: e.File })
          }
        })
      }
    }
    // 补充松散文件（去重）
    try {
      const idxData = JSON.parse(await fs.readFile(`${toModelPath}/actions_index.json`, 'utf-8'))
      const seenFiles = new Set(allActs.map(a => a.file))
      for (const item of idxData) {
        if (!seenFiles.has(item.file)) {
          const name = item.file.replace(/\.(motion3|exp3)\.json$/, '')
          allActs.push({ type: item.type, name: name, file: item.file })
          seenFiles.add(item.file)
        }
      }
    } catch(e) {}
    // 绯英名称映射（名字整体下移一位，1→空，14→没脸见人了）
    if (modelPath.indexOf('Honkai_StarRail/feiying') >= 0) {
      var feiyingNames = {
        'expression13': '空', 'expression12': '尾巴', 'expression1': '人类',
        'expression10': '智慧', 'expression11': '狐耳', 'expression2': '新狐耳',
        'expression3': '脸红', 'expression4': '星星眼', 'expression5': '拜托拜托',
        'expression6': '爱心眼', 'expression7': '生气', 'expression8': '无语',
        'expression9': '叼面包'
      };
      allActs.forEach(function(a) {
        if (a.type === 'expression' && feiyingNames[a.name]) a.name = feiyingNames[a.name];
      });
      // 14哭哭 → 没脸见人了
      allActs.forEach(function(a) {
        if (a.file === '14哭哭.exp3.json') a.name = '没脸见人了';
      });
    }
    // 按 model.json 原始顺序保留，特殊排最后
    var normActs = [], specActs = [];
    allActs.forEach(function(a) { (a.type === 'special' ? specActs : normActs).push(a); });
    allActs = normActs.concat(specActs);
    // 分配顺序值（从1开始）
    allActs.forEach(function(a, idx) { a.sortOrder = idx + 1; });
    // 已检测到水印参数并注入的模型才添加水印按键
    // 检测 Sound-only 的 motion（模型切换触发）
    var addedSwitches = {};
    if (modelConfig && modelConfig.FileReferences && modelConfig.FileReferences.Motions) {
      Object.keys(modelConfig.FileReferences.Motions).forEach(function(g) {
        modelConfig.FileReferences.Motions[g].forEach(function(m) {
          if (m.Sound && !m.File && !m.Expression) {
            var name = g.replace(/^Tap/, '').replace(/[0-9]/g, '');
            var targetModel = '';
            if (name.indexOf('爱芮') >= 0) targetModel = 'Zenless_Zone_Zero/irui';
            else if (name.indexOf('南宫') >= 0) targetModel = 'Zenless_Zone_Zero/nangongyu';
            else if (name.indexOf('千夏') >= 0) targetModel = 'Zenless_Zone_Zero/qianxia';
            if (targetModel && !addedSwitches[targetModel]) {
              addedSwitches[targetModel] = true;
              allActs.push({ type: 'expression', name: '[切换]' + name });
            }
          }
        });
      });
    }
    // 只有有实际表情的模型才添加特殊按键
    var hasRealActions = allActs.some(function(a) { return a.type === 'expression'; });
    if (hasRealActions) {
      if (watermarkedModels.has(modelPath)) {
        allActs.push({ type: 'special', name: '水印', id: 'watermark', combo: 'ctrl+alt+F1' })
      }
      allActs.push({ type: 'special', name: '重置', id: 'reset', combo: 'ctrl+alt+F2' })
    }
    // 按来源/游戏生成文件夹 → 角色文件夹 → actions_cache.json
    const parts = modelPath.split('/')
    const category = parts[0]
    const charName = parts.slice(1).join('/')
    const charDir = `${cacheDir}/${category}/${charName}`
    await Helper.ensureExistFolder(charDir)
    await fs.writeFile(`${charDir}/actions_cache.json`, Helper.stringify(allActs))
    cacheCount++
    console.log(`   ${category}/${charName}: ${allActs.length} 个动作`)
  }
  console.log(`   已生成 ${cacheCount} 个角色的按键映射缓存`)
}

async function createModelsIndexJsonFile() {
  const modelPaths = await getAllModelPaths()
  await fs.writeFile(`${toBasePath}/${modelsIndexJsonFileName}`, Helper.stringify(modelPaths))
  
  // 同时也生成 model_list.json，供 live2d-widget 加载
  // 注意格式需要符合 live2d-widget 的要求：
  // { "models": [ ...模型路径数组... ], "messages": [ ...消息数组... ] }
  const modelNamesPath = modelsNameJsonFileName
  let existingNames = {}
  try {
    const existingContent = await fs.readFile(modelNamesPath, 'utf-8')
    existingNames = JSON.parse(existingContent)
  } catch (e) {}
  
  const modelList = {
    models: [],
    messages: []
  }
  
  modelPaths.forEach(modelInfo => {
    modelList.models.push(modelInfo.modelPath)
    // 获取中文名称，或者使用默认名称
    const modelName = existingNames[modelInfo.modelPath] || modelInfo.modelIntroduce || modelInfo.modelPath
    modelList.messages.push(modelName)
  })
  
  await fs.writeFile(`${toBasePath}/model_list.json`, Helper.stringify(modelList))
  return modelPaths
}

async function updateModelCategoriesJsonFile() {
  const categoriesFilePath = 'model-categories.json'
  
  let existingCategories = {}
  try {
    const existingContent = await fs.readFile(categoriesFilePath, 'utf-8')
    existingCategories = JSON.parse(existingContent)
    console.log(`已读取现有模型分类配置`)
  } catch (e) {
    console.log(`未找到现有模型分类配置，将创建新文件`)
  }
  
  const updatedCategories = { ...existingCategories }
  const sourceFolders = ['models_Cubism2', 'models_Cubism3']
  const categoryFolders = new Set()
  
  // 扫描所有模型文件夹，收集分类文件夹
  for (const folder of sourceFolders) {
    try {
      await fs.access(folder)
      const dirents = await fs.readdir(folder, { withFileTypes: true })
      
      for (const dirent of dirents) {
        if (dirent.isDirectory()) {
          categoryFolders.add(dirent.name)
        }
      }
    } catch (e) {
      console.log(`文件夹 ${folder} 不存在，跳过`)
    }
  }
  
  // 检查并添加新分类
  for (const folderName of categoryFolders) {
    if (!(folderName in updatedCategories)) {
      // 使用文件夹名作为默认名称（去掉下划线，首字母大写）
      const defaultName = folderName
        .replace(/_/g, ' ')
        .replace(/(^\w| \w)/g, m => m.toUpperCase())
      
      updatedCategories[folderName] = defaultName
      console.log(`新增模型分类：${folderName} -> ${defaultName}`)
    }
  }
  
  // 清理不存在的文件夹的分类（可选，暂时保留以防需要）
  // 这里我们选择保留所有分类，即使文件夹不存在
  
  await fs.writeFile(categoriesFilePath, Helper.stringify(updatedCategories))
  console.log(`模型分类配置已更新到 ${categoriesFilePath}`)
}

async function createModelsNameJsonFile(modelPaths) {
  const modelsNameFilePath = `${modelsNameJsonFileName}`
  
  let existingNames = {}
  try {
    const existingContent = await fs.readFile(modelsNameFilePath, 'utf-8')
    existingNames = JSON.parse(existingContent)
    console.log(`已读取现有模型名称配置`)
  } catch (e) {
    console.log(`未找到现有模型名称配置，将创建新文件`)
  }
  
  const updatedNames = { ...existingNames }
  
  for (const { modelPath, modelIntroduce } of modelPaths) {
    if (!(modelPath in updatedNames)) {
      updatedNames[modelPath] = modelIntroduce || modelPath
      console.log(`新增模型名称：${modelPath} -> ${updatedNames[modelPath]}`)
    }
  }
  
  await fs.writeFile(modelsNameFilePath, Helper.stringify(updatedNames))
  console.log(`模型名称配置已更新到 ${modelsNameFilePath}`)
}

async function createCubism3ModelJson(fromModelPath, toModelPath) {
  // 自动修复中文文件名问题
  const modelName = fromModelPath.split('/').pop()
  await fixChineseModel3Json(fromModelPath, modelName)
  
  // 首先优先尝试读取自定义 model.json
  let modelJson
  try {
    const modelTemplateJsonFile = await fs.readFile(`${fromModelPath}/${modelTemplateJsonFileName}`, 'utf-8')
    console.log(`找到自定义 model.json，使用它`)
    modelJson = JSON.parse(modelTemplateJsonFile)
  } catch (e) {
    // 如果没有自定义 model.json，尝试查找原生 .model3.json
    console.log(`没有找到自定义 model.json，尝试查找原生 .model3.json`)
    const dirents = await fs.readdir(fromModelPath)
    const model3Files = dirents.filter(f => f.endsWith('.model3.json'))
    
    if (model3Files.length > 0) {
      const model3File = model3Files[0]
      console.log(`找到 ${model3File}，使用它`)
      const model3JsonFile = await fs.readFile(`${fromModelPath}/${model3File}`, 'utf-8')
      modelJson = JSON.parse(model3JsonFile)
      // 如果需要，补充 modelIntroduce
      if (!modelJson.modelIntroduce) {
        modelJson.modelIntroduce = fromModelPath.split('/').pop()
      }
    } else {
      console.error(`在 ${fromModelPath} 中没有找到 model.json 或 .model3.json`)
      return
    }
  }
  
  const cubism3Json = {
    modelIntroduce: modelJson.modelIntroduce || modelJson.FileReferences?.Moc?.replace('.moc3', '') || '',
    version: '3.0',
    model: '../../../models_Cubism3/' + fromModelPath.split('/').slice(1).join('/') + '/' + (modelJson.FileReferences?.Moc || 'Moc.moc3'),
    textures: modelJson.FileReferences?.Textures ? modelJson.FileReferences.Textures.map(t => 
      '../../../models_Cubism3/' + fromModelPath.split('/').slice(1).join('/') + '/' + t
    ) : [],
    physics: modelJson.FileReferences?.Physics ? 
      '../../../models_Cubism3/' + fromModelPath.split('/').slice(1).join('/') + '/' + modelJson.FileReferences.Physics : undefined,
    motions: {
      Idle: [{}],
      TapBody: [{}]
    }
  }
  
  if (modelJson.FileReferences?.Motions) {
    for (const [group, motions] of Object.entries(modelJson.FileReferences.Motions)) {
      cubism3Json.motions[group] = motions.map(motion => ({
        file: motion.File ? '../../../models_Cubism3/' + fromModelPath.split('/').slice(1).join('/') + '/' + motion.File : undefined,
        sound: motion.Sound ? '../../../models_Cubism3/' + fromModelPath.split('/').slice(1).join('/') + '/' + motion.Sound : undefined
      }))
    }
  }
  
  await fs.writeFile(`${toModelPath}/${textureDefaultJsonFileName}`, Helper.stringify(cubism3Json))
  await fs.writeFile(`${toModelPath}/${texturesIndexJsonFileName}`, Helper.stringify(['default']))
}

async function createTexturesIndexJsonFile(toModelPath) {
  const dirents = await fs.readdir(toModelPath, { withFileTypes: true })
  const textureNames = dirents.map(dirent => path.parse(dirent.name).name)
  await fs.writeFile(`${toModelPath}/${texturesIndexJsonFileName}`, Helper.stringify(textureNames))
  return textureNames
}

async function createTextureJsonFiles(fromModelPath, toModelPath) {
  const textureDefaultJsonStr = await getTextureDefaultJsonStr(fromModelPath, toModelPath)

  await fs.writeFile(`${toModelPath}/${textureDefaultJsonFileName}`, textureDefaultJsonStr)

  const textureGroups = await getTextureGroups(fromModelPath)
  
  const relativeFromPath = fromModelPath.split('/').slice(1).join('/')

  const allTextures = Helper.factorial(textureGroups.map(({ textures }) => textures))

  await Promise.all(allTextures.map(async textures => {
    const textureJson = JSON.parse(textureDefaultJsonStr)

    textureJson.textures = textures.map((texture, index) => {
      const { partName } = textureGroups[index]
      return '../../../models_Cubism2/' + relativeFromPath + '/' + modelTexturesFolderPath + '/' + partName + '/' + texture
    })

    await fs.writeFile(`${toModelPath}/${textures.map(texture => path.parse(texture).name).join('&')}.json`, Helper.stringify(textureJson))
  }))
}

async function getTextureDefaultJsonStr(fromModelPath, toModelPath) {
  const modelTemplateJsonFile = await fs.readFile(`${fromModelPath}/${modelTemplateJsonFileName}`, 'utf-8')

  const defaultTextureJson = JSON.parse(modelTemplateJsonFile)
  
  const relativeFromPath = fromModelPath.split('/').slice(1).join('/')
  
  if (defaultTextureJson.model) {
    defaultTextureJson.model = '../../../models_Cubism2/' + relativeFromPath + '/' + defaultTextureJson.model
  }
  if (defaultTextureJson.pose) {
    defaultTextureJson.pose = '../../../models_Cubism2/' + relativeFromPath + '/' + defaultTextureJson.pose
  }
  if (defaultTextureJson.physics) {
    defaultTextureJson.physics = '../../../models_Cubism2/' + relativeFromPath + '/' + defaultTextureJson.physics
  }
  if (defaultTextureJson.expressions) {
    defaultTextureJson.expressions.forEach(({ file }, index, array) => {
      if (file) array[index].file = '../../../models_Cubism2/' + relativeFromPath + '/' + file
    })
  }
  if (defaultTextureJson.motions) {
    Object.values(defaultTextureJson.motions).forEach(groups => {
      groups.forEach((motion, index, array) => {
        if (motion.file) array[index].file = '../../../models_Cubism2/' + relativeFromPath + '/' + motion.file
        if (motion.sound) array[index].sound = '../../../models_Cubism2/' + relativeFromPath + '/' + motion.sound
      })
    })
  }
  if (defaultTextureJson.textures) {
    defaultTextureJson.textures = defaultTextureJson.textures.map(t => '../../../models_Cubism2/' + relativeFromPath + '/' + t)
  }

  return Helper.stringify(defaultTextureJson)
}

async function getTextureGroups(fromModelPath) {
  // texture 是分部分的，几个文件夹就几部分，也就是数组的长度，从模板文件获取顺序
  const modelTemplateJsonFile = await fs.readFile(`${fromModelPath}/${modelTemplateJsonFileName}`, 'utf-8')

  const defaultPartNames = JSON.parse(modelTemplateJsonFile).textures.map(texture => path.parse(texture).dir.split('/').pop())

  const textureGroups = Array(defaultPartNames.length).fill(null)

  await Promise.all(defaultPartNames.map(async (partName, index) => {
    textureGroups[index] = {
      partName,
      textures: await fs.readdir(`${fromModelPath}/${modelTexturesFolderPath}/${partName}`)
    }
  }))

  return textureGroups
}

async function getAllModelPaths() {
  const modelPaths = []
  
  const sourceFolders = ['models_Cubism2', 'models_Cubism3']
  
  for (const folder of sourceFolders) {
    try {
      await fs.access(folder)
      await fillModelPath(folder, folder)
    } catch (e) {
      console.log(`文件夹 ${folder} 不存在，跳过`)
    }
  }
  
  return modelPaths

  async function fillModelPath(basePath, currentPath) {
    // 优先找自定义 model.json！
    let modelJson = null
    let foundModelJson = false
    
    // 先尝试自定义 model.json！
    const modelTemplateJsonFilePath = `${currentPath}/${modelTemplateJsonFileName}`
    try {
      const stat = await fs.stat(modelTemplateJsonFilePath)
      if (stat.isFile()) {
        console.log(`在 ${currentPath} 中找到自定义 model.json，优先使用它`)
        modelJson = JSON.parse(await fs.readFile(modelTemplateJsonFilePath, 'utf-8'))
        foundModelJson = true
      }
    } catch (e) {
      // 找不到自定义 model.json，尝试原生 .model3.json
    }
    
    // 如果没找到自定义 model.json，才尝试原生 .model3.json
    if (!foundModelJson) {
      try {
        const dirents = await fs.readdir(currentPath)
        const model3Files = dirents.filter(f => f.endsWith('.model3.json'))
        if (model3Files.length > 0) {
          const model3File = model3Files[0]
          console.log(`在 ${currentPath} 中找到原生 ${model3File}，使用它`)
          const model3JsonFile = await fs.readFile(`${currentPath}/${model3File}`, 'utf-8')
          modelJson = JSON.parse(model3JsonFile)
          // 如果需要，补充 modelIntroduce
          if (!modelJson.modelIntroduce) {
            modelJson.modelIntroduce = currentPath.split('/').pop()
          }
        }
      } catch (e) {
        // 找不到任何配置，继续递归
      }
    }

    if (modelJson) {
      // 根据来源文件夹判断是 Cubism2 还是 Cubism3
      const isCubism3 = basePath === 'models_Cubism3'
      
      // 为 Cubism3 模型自动创建配置文件
      if (isCubism3) {
        await ensureCubism3ConfigFiles(currentPath, modelJson)
      }
      
      modelPaths.push({
        modelIntroduce: modelJson.modelIntroduce || modelJson.FileReferences?.Moc?.replace('.moc3', '') || currentPath.slice(currentPath.indexOf('/') + 1),
        modelPath: currentPath.slice(basePath.length + 1),
        isCubism3: isCubism3,
        sourceFolder: basePath
      })
      return
    }

    // 没有找到任何模型配置文件，继续递归查找子目录
    const dirents = await fs.readdir(currentPath, { withFileTypes: true })

    await Promise.all(dirents.map(async dirent => {
      if (!dirent.isDirectory()) {
        return
      }

      await fillModelPath(basePath, `${currentPath}/${dirent.name}`)
    }))
  }
}

async function ensureCubism3ConfigFiles(modelPath, modelJson) {
  const modelName = modelPath.split('/').pop()
  const model3JsonPath = `${modelPath}/${modelName}.model3.json`
  const configJsonPath = `${modelPath}/config.json`
  
  // 获取 moc 文件名和纹理
  const mocFile = modelJson.FileReferences?.Moc || 'Moc.moc3'
  const textures = modelJson.FileReferences?.Textures || ['Textures_.png']
  const physicsFile = modelJson.FileReferences?.Physics
  
  // 检查并创建 .model3.json - 首先检查是否已经存在任意的 .model3.json
  let foundModel3Json = false
  try {
    const dirents = await fs.readdir(modelPath)
    for (const file of dirents) {
      if (file.endsWith('.model3.json')) {
        foundModel3Json = true
        console.log(`已找到现有 model3.json: ${file}`)
        break
      }
    }
  } catch (e) {}
  
  if (!foundModel3Json) {
    // 如果没找到，才尝试创建
    try {
      await fs.access(model3JsonPath)
      foundModel3Json = true
    } catch (e) {
      // 没找到，创建默认的（合并自定义 model.json 中的动作/表情/点击区域）
      var customMotions = modelJson.FileReferences && modelJson.FileReferences.Motions ? JSON.parse(JSON.stringify(modelJson.FileReferences.Motions)) : undefined;
      // 过滤掉 File 为 null 的空动作（如 NullValue）
      if (customMotions) {
        Object.keys(customMotions).forEach(function(g) {
          customMotions[g] = customMotions[g].filter(function(m) { return m && m.File != null; });
          if (customMotions[g].length === 0) delete customMotions[g];
        });
        if (Object.keys(customMotions).length === 0) customMotions = undefined;
      }
      var customExpressions = modelJson.FileReferences && modelJson.FileReferences.Expressions ? JSON.parse(JSON.stringify(modelJson.FileReferences.Expressions)) : undefined;
      var customHitAreas = modelJson.HitAreas ? JSON.parse(JSON.stringify(modelJson.HitAreas)) : undefined;
      var fileRefs = {
        Moc: mocFile,
        Textures: textures,
        Physics: physicsFile || undefined
      };
      if (customMotions) fileRefs.Motions = customMotions;
      if (customExpressions) fileRefs.Expressions = customExpressions;
      if (customHitAreas) fileRefs.HitAreas = customHitAreas;
      
      const model3Json = {
        Version: 3,
        FileReferences: fileRefs,
        Groups: [
          {
            Target: 'Parameter',
            Name: 'EyeBlink',
            Ids: []
          },
          {
            Target: 'Parameter',
            Name: 'LipSync',
            Ids: []
          }
        ]
      }
      // 清理 undefined 值
      const cleanJson = JSON.parse(JSON.stringify(model3Json))
      await fs.writeFile(model3JsonPath, Helper.stringify(cleanJson))
      console.log(`已创建: ${model3JsonPath}`)
      foundModel3Json = true
    }
  }
  
  // 如果已存在 model3.json 但缺少 Motions/Expressions，尝试从自定义 model.json 更新
  if (foundModel3Json) {
    try {
      var existingContent = await fs.readFile(model3JsonPath, 'utf-8');
      var existingJson = JSON.parse(existingContent);
      var needsUpdate = false;
      if (!existingJson.FileReferences) { existingJson.FileReferences = {}; needsUpdate = true; }
      // 清理已存在的 Motions 中的 null File 条目
      if (existingJson.FileReferences && existingJson.FileReferences.Motions) {
        Object.keys(existingJson.FileReferences.Motions).forEach(function(g) {
          existingJson.FileReferences.Motions[g] = existingJson.FileReferences.Motions[g].filter(function(m) { return m && m.File != null; });
          if (existingJson.FileReferences.Motions[g].length === 0) delete existingJson.FileReferences.Motions[g];
        });
        if (Object.keys(existingJson.FileReferences.Motions).length === 0) delete existingJson.FileReferences.Motions;
        needsUpdate = true;
      }
      if (!existingJson.FileReferences.Motions && modelJson.FileReferences && modelJson.FileReferences.Motions) {
        var newMotions = JSON.parse(JSON.stringify(modelJson.FileReferences.Motions));
        Object.keys(newMotions).forEach(function(g) {
          newMotions[g] = newMotions[g].filter(function(m) { return m && m.File != null; });
          if (newMotions[g].length === 0) delete newMotions[g];
        });
        if (Object.keys(newMotions).length > 0) {
          existingJson.FileReferences.Motions = newMotions;
          needsUpdate = true;
          console.log(`  添加 Motions 到已存在的 model3.json`);
        }
      }
      if (!existingJson.FileReferences.Expressions && modelJson.FileReferences && modelJson.FileReferences.Expressions) {
        existingJson.FileReferences.Expressions = JSON.parse(JSON.stringify(modelJson.FileReferences.Expressions));
        needsUpdate = true;
        console.log(`  添加 Expressions 到已存在的 model3.json`);
      }
      if (!existingJson.HitAreas && modelJson.HitAreas) {
        existingJson.HitAreas = JSON.parse(JSON.stringify(modelJson.HitAreas));
        needsUpdate = true;
        console.log(`  添加 HitAreas 到已存在的 model3.json`);
      }
      if (needsUpdate) {
        await fs.writeFile(model3JsonPath, Helper.stringify(existingJson));
        console.log(`  已更新: ${model3JsonPath}`);
      }
    } catch(e) {
      // 如果读取失败，忽略（可能是被其他进程占用等）
    }
  }
  
  // 检查并创建 config.json
  try {
    await fs.access(configJsonPath)
  } catch (e) {
    const configJson = {
      scale: 1.0,
      translate: {
        x: 0,
        y: 0
      }
    }
    await fs.writeFile(configJsonPath, Helper.stringify(configJson))
    console.log(`已创建: ${configJsonPath}`)
  }
  
  // 检查并创建 Physics.json（如果 model.json 中引用了 Physics）
  if (physicsFile) {
    const physicsPath = `${modelPath}/${physicsFile}`
    try {
      await fs.access(physicsPath)
    } catch (e) {
      const physicsJson = {
        Version: 3,
        Meta: {
          PhysicsSettingCount: 0,
          TotalInputCount: 0,
          TotalOutputCount: 0,
          TotalParameterCount: 0,
          TotalPartCount: 0
        },
        PhysicsSettings: []
      }
      await fs.writeFile(physicsPath, Helper.stringify(physicsJson))
      console.log(`已创建: ${physicsPath}`)
    }
  }
}

function setBuildOptions(buildOptions) {
  process.argv.slice(2).forEach(arg => {
    const [key, val] = arg.split('=')
    switch (key) {
      case 'isCompress':
        Object.assign(buildOptions, {
          [key]: val === 'true'
        })
        break
      case 'fromBasePath':
      case 'indexes':
        Object.assign(buildOptions, {
          [key]: val
        })
    }
  })
  return buildOptions
}
