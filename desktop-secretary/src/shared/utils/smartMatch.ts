import * as fs from 'fs'
import * as path from 'path'

// ============================================================
// 智能文件匹配 — 按待办标题关键词对文件夹内文件名模糊匹配
// 匹配权重：完全匹配100 / 全关键词60 / 部分关键词30
// 同权重时取最近修改的文件
// ============================================================

// Task 10.2 — 停用词/语气词过滤列表（中英文）
const STOPWORDS_ZH = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人',
  '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这', '那',
  '与', '及', '或', '关于', '针对', '对于', '进行', '完成',
  '整理', '更新', '提交', '处理', '准备', '确认',
  '一下', '一些', '一种', '之类', '什么', '这个', '那个', '这些',
])

const STOPWORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
  'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'do',
  'does', 'did', 'will', 'would', 'could', 'should',
])

// Task 10.1 — 关键词提取（中文结巴分词 / 英文空格分词）
export function extractKeywords(title: string): string[] {
  const cleaned = title.replace(/[！!@#$%^&*(),.?":{}|<>，。？！、；：""''（）【】《》]/g, ' ').trim()

  // 检测是否包含中文
  const hasChinese = /[一-鿿]/.test(cleaned)

  let words: string[]
  if (hasChinese) {
    // 简化分词：按字符边界切分（jieba-js 在 Node 主进程中可用，渲染进程用简化版）
    // 用正则将连续中文切成2-4字的词组，英文保留完整单词
    words = simpleChineseTokenize(cleaned)
  } else {
    words = cleaned.split(/\s+/).filter(Boolean)
  }

  return words
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length >= 2)
    .filter(w => !STOPWORDS_ZH.has(w) && !STOPWORDS_EN.has(w))
}

// 简化中文分词：提取所有连续中文序列 + 英文单词
// 注：生产环境可接入 nodejieba 等更精准分词库
function simpleChineseTokenize(text: string): string[] {
  const tokens: string[] = []
  // 英文单词
  const enMatches = text.match(/[a-zA-Z0-9]+/g)
  if (enMatches) tokens.push(...enMatches)
  // 中文：按连续汉字提取，长度>=2的都保留（滑动窗口2-4字）
  const zhMatches = text.match(/[一-鿿]+/g)
  if (zhMatches) {
    zhMatches.forEach((segment: string) => {
      // 保留整个段
      if (segment.length >= 2) tokens.push(segment)
      // 2字子串
      for (let i = 0; i < segment.length - 1; i++) {
        tokens.push(segment.slice(i, i + 2))
      }
      // 3字子串
      for (let i = 0; i < segment.length - 2; i++) {
        tokens.push(segment.slice(i, i + 3))
      }
    })
  }
  return Array.from(new Set(tokens)) // 去重
}

interface FileEntry {
  name: string      // 含扩展名
  nameNoExt: string // 去扩展名
  fullPath: string
  mtimeMs: number
}

// 计算单个文件的匹配分数
function scoreFile(file: FileEntry, keywords: string[], titleLower: string): number {
  const nameLower = file.nameNoExt.toLowerCase()

  // 完全匹配
  if (nameLower === titleLower) return 100

  const matchedAll = keywords.every(kw => nameLower.includes(kw))
  if (matchedAll) return 60

  const matchedCount = keywords.filter(kw => nameLower.includes(kw)).length
  if (matchedCount > 0) return 30

  return 0
}

export interface MatchResult {
  filePath: string
  score: number
}

// Task 10.3-10.5 — 主匹配函数
export function smartMatch(title: string, folderPaths: string[]): MatchResult | null {
  if (folderPaths.length === 0) return null

  const keywords = extractKeywords(title)
  if (keywords.length === 0) return null

  const titleLower = title.toLowerCase()
  let allFiles: FileEntry[] = []

  for (const folderPath of folderPaths) {
    if (!fs.existsSync(folderPath)) continue
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true })
      const files = entries
        .filter(e => e.isFile())
        .map(e => {
          const fullPath = path.join(folderPath, e.name)
          let mtimeMs = 0
          try {
            mtimeMs = fs.statSync(fullPath).mtimeMs
          } catch {
            // ignore stat errors
          }
          return {
            name: e.name,
            nameNoExt: path.basename(e.name, path.extname(e.name)),
            fullPath,
            mtimeMs,
          }
        })
      allFiles.push(...files)
    } catch {
      // ignore unreadable folders
    }
  }

  // Task 10.5 — 超过 500 文件时截断为最近修改的 500 个
  if (allFiles.length > 500) {
    allFiles.sort((a, b) => b.mtimeMs - a.mtimeMs)
    allFiles = allFiles.slice(0, 500)
  }

  let best: MatchResult | null = null

  for (const file of allFiles) {
    const score = scoreFile(file, keywords, titleLower)
    if (score === 0) continue
    if (
      best === null ||
      score > best.score ||
      // Task 10.4 — 同权重取最近修改
      (score === best.score && file.mtimeMs > (best as MatchResult & { mtimeMs: number }).mtimeMs)
    ) {
      best = { filePath: file.fullPath, score }
      ;(best as MatchResult & { mtimeMs: number }).mtimeMs = file.mtimeMs
    }
  }

  // 只返回 filePath 和 score，清除内部 mtimeMs
  if (best) {
    return { filePath: best.filePath, score: best.score }
  }
  return null
}
