#!/usr/bin/env node
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import Anthropic from '@anthropic-ai/sdk'

const dirs = ['opeds', 'investigate']
const outPath = path.resolve('_data', 'summaries.json')

const client = new Anthropic()

async function summarize(text, title) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Summarize this article in 1-2 sentences (max 50 words). Be concise and capture the main point. No preamble, just the summary. Make the reader want to read more.

Title: ${title}

${text.slice(0, 3000)}`,
      },
    ],
  })

  return response.content[0].text.trim()
}

async function loadExistingSummaries() {
  try {
    const data = await fs.readFile(outPath, 'utf8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function main() {
  const summaries = await loadExistingSummaries()
  let newCount = 0
  let skippedCount = 0

  for (const dir of dirs) {
    const dirPath = path.resolve(dir)
    let files
    try {
      files = await fs.readdir(dirPath)
    } catch {
      continue
    }

    for (const f of files.filter((x) => x.endsWith('.md') && x !== 'index.md')) {
      const slug = path.basename(f, '.md')

      if (summaries[slug]) {
        console.log(`⏭ ${dir}/${f}: already has summary, skipped`)
        skippedCount++
        continue
      }

      const filePath = path.join(dirPath, f)
      const raw = await fs.readFile(filePath, 'utf8')
      const { data, content } = matter(raw)
      const text = content.replace(/\n+/g, ' ').trim()

      try {
        const summary = await summarize(text, data.title || slug)
        summaries[slug] = summary
        console.log(`✓ ${dir}/${f}: ${summary}`)
        newCount++
      } catch (err) {
        console.error(`✗ ${dir}/${f}: ${err.message}`)
        const sentences = text.split(/(?<=[.!?])\s+/)
        summaries[slug] = sentences.slice(0, 2).join(' ')
        newCount++
      }
    }
  }

  console.log(`\nGenerated ${newCount} new summaries, skipped ${skippedCount} existing`)

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify(summaries, null, 2), 'utf8')
  console.log('\nWrote summaries to', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
