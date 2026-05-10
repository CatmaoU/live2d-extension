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
  await Helper.deleteFolder(toBasePath)
  await Helper.ensureExistFolder(toBasePath)

  // 先更新模型分类文件
  await updateModelCategoriesJsonFile()

  const modelPaths = await createModelsIndexJsonFile()
  
  await createModelsNameJsonFile(modelPaths)

  for (const { modelPath, isCubism3, sourceFolder } of modelPaths) {
    console.log(`开始转换：${modelPath}${isCubism3 ? ' (Cubism 3格式)' : ''} [来自: ${sourceFolder}]`)

    const fromModelPath = `${sourceFolder}/${modelPath}`
    const toModelPath = `${toBasePath}/${modelPath}`

    await Helper.ensureExistFolder(toModelPath)

    if (isCubism3) {
      await createCubism3ModelJson(fromModelPath, toModelPath)
    } else {
      await createTextureJsonFiles(fromModelPath, toModelPath)
      await createTexturesIndexJsonFile(toModelPath)
    }

    console.log(`转换完成：${modelPath}`)
  }
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
      // 没找到，创建默认的
      const model3Json = {
        Version: 3,
        FileReferences: {
          Moc: mocFile,
          Textures: textures,
          Physics: physicsFile || undefined
        },
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
