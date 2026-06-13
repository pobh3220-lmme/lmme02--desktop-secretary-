/**
 * 智能文件匹配单元测试
 * Task 10.9 — 性能 + 匹配正确性
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { smartMatch, extractKeywords } from '../src/shared/utils/smartMatch'

describe('extractKeywords', () => {
  test('提取中文关键词', () => {
    const kw = extractKeywords('提交项目方案')
    expect(kw.length).toBeGreaterThan(0)
    // 应包含"项目"或"方案"
    const joined = kw.join('')
    expect(joined).toMatch(/项目|方案/)
  })

  test('提取英文关键词', () => {
    const kw = extractKeywords('Review design proposal')
    expect(kw).toContain('review')
    expect(kw).toContain('design')
    expect(kw).toContain('proposal')
  })

  test('过滤停用词', () => {
    const kw = extractKeywords('整理一下文件')
    expect(kw).not.toContain('一下')
  })
})

describe('smartMatch', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-match-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  const createFile = (name: string) => {
    fs.writeFileSync(path.join(tmpDir, name), '')
  }

  test('完全匹配：返回100分', () => {
    createFile('项目方案.docx')
    const result = smartMatch('项目方案', [tmpDir])
    expect(result).not.toBeNull()
    expect(result!.score).toBe(100)
    expect(result!.filePath).toContain('项目方案.docx')
  })

  test('包含关键词：返回低分匹配', () => {
    createFile('2024年项目方案汇报.pptx')
    const result = smartMatch('项目方案', [tmpDir])
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThanOrEqual(30)
  })

  test('无匹配文件时返回 null', () => {
    createFile('完全不相关的文件.txt')
    const result = smartMatch('项目方案', [tmpDir])
    expect(result).toBeNull()
  })

  test('文件夹不存在时静默返回 null', () => {
    const result = smartMatch('项目', ['/nonexistent/path'])
    expect(result).toBeNull()
  })

  test('空文件夹时返回 null', () => {
    const result = smartMatch('项目', [tmpDir])
    expect(result).toBeNull()
  })

  test('同权重时取最近修改的文件', () => {
    const older = path.join(tmpDir, '项目报告旧.docx')
    const newer = path.join(tmpDir, '项目报告新.docx')
    fs.writeFileSync(older, '')
    fs.writeFileSync(newer, '')

    // 手动设置 mtime：older = 100秒前，newer = 现在
    const now = Date.now()
    fs.utimesSync(older, (now - 100_000) / 1000, (now - 100_000) / 1000)
    fs.utimesSync(newer, now / 1000, now / 1000)

    const result = smartMatch('项目报告', [tmpDir])
    expect(result?.filePath).toContain('新')
  })

  test('性能：< 500 文件时在 200ms 内完成', () => {
    // 创建 300 个文件
    for (let i = 0; i < 300; i++) {
      createFile(`文件_${i}.txt`)
    }
    createFile('目标文件.docx')

    const start = Date.now()
    const result = smartMatch('目标文件', [tmpDir])
    const elapsed = Date.now() - start

    expect(result).not.toBeNull()
    expect(elapsed).toBeLessThan(200)
  })
})
