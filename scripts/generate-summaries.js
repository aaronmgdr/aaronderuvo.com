#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { pipeline } from '@huggingface/transformers'

const dirs = ['opeds', 'investigate']
const defaultOutPath = path.resolve('_data', 'summaries.json')

// Runs fully on device. Weights are downloaded once to the local Hugging Face
// cache (~/.cache/huggingface) on first run, then reused offline.
const model = process.env.SUMMARY_MODEL || 'onnx-community/LFM2-1.2B-ONNX'
// 1.2B at q4f16 (~800MB) reads the essay as a whole; the 350M models drift into
// quoting a section heading. Override with fp16 for the 2.4GB full-precision
// export, or SUMMARY_MODEL=onnx-community/LFM2.5-350M-ONNX for a smaller download.
const dtype = process.env.SUMMARY_DTYPE || 'q4f16'

const args = process.argv.slice(2)
const force = args.includes('--force')
const outPath = args.includes('--out')
  ? path.resolve(args[args.indexOf('--out') + 1])
  : defaultOutPath

let generator

async function getGenerator() {
  if (!generator) {
    console.log(`Loading ${model} (${dtype}) — first run downloads the weights...`)
    generator = await pipeline('text-generation', model, { dtype })
  }
  return generator
}

// A local model sometimes answers the question instead of writing it, or wraps
// it in chatter. Keep the first line that reads like a question, drop the rest.
function extractQuestion(raw) {
  const text = raw
    .replace(/<\|[^|]*\|>/g, '')
    .replace(/^\s*(sure|here'?s|the question is)\b[^\n]*[:\n]/i, '')
    .trim()

  const questions = text
    .split(/(?<=\?)\s+|\n+/)
    .map((s) => s.replace(/^["'*\-\s]+|["'*\s]+$/g, '').trim())
    .filter((s) => s.endsWith('?') && s.length > 15)

  return questions[0] || ''
}

// Few-shot pairs. These are deliberately full-length essays with headings and
// digressions, because that is the shape of the real input — short snippets
// teach the model to summarize a snippet. The answers are short and plainly
// worded on purpose: the pairing is what teaches "long essay in, one plain
// question out". Unrelated topics are NOT sufficient to stop these bleeding
// into a real answer — an early version had an essay come back asking about
// sourdough. The system-prompt disclaimer is what actually holds that line, so
// check a full run if you change it.
const fewShot = [
  {
    essay: `Title: Rewiring a 1920s House

# Rewiring a 1920s House

We bought the place knowing the wiring was old. I did not know what old meant.

## What was in the walls

Knob and tube, mostly. Cloth insulation that crumbled when you touched it. Somewhere around 1960 someone had run a few new circuits to the kitchen and simply abandoned the old ones in place, still live. There were four junction boxes buried behind plaster with no access panel, which is illegal now and was probably illegal then.

## Permits and inspectors

I assumed the permit was the bureaucratic part and the wiring was the real work. It was the other way around. The inspector came three times. The first visit was a list of things I had done wrong. The second was a list of things the previous owner had done wrong that were now my problem. The third he signed off in four minutes.

## What it cost

Eleven thousand dollars and six weekends, against the four thousand and two weekends I had budgeted. Most of the overrun was not materials. It was discovering that you cannot fish a wire through a wall that has been insulated with blown cellulose, and that every wall in the house had been.

## What I would do differently

Open the walls first, before pricing anything. Every estimate I got was wrong because every estimate was based on guessing what was behind the plaster. The one electrician who insisted on cutting an inspection hole before quoting was the only one whose number turned out to be close. You are not really pricing the wiring. You are pricing how much you do not know yet.`,
    question: 'What does rewiring an old house actually involve?',
  },
  {
    essay: `Title: A Year of Sourdough

# A Year of Sourdough

I kept a starter alive for a year. Here is the honest accounting.

## The daily part

Twice a day, discard half, feed equal weights of flour and water. It takes ninety seconds. The ninety seconds is not the cost. The cost is that it must happen roughly on schedule, which means the starter has opinions about your travel plans and your hangovers.

## The bread itself

Better than supermarket bread, clearly. Better than the good bakery six blocks away, no. Not once in a year. My crumb got more even, my scoring got prettier, and my loaves converged on something that was reliably good and never exceptional.

## The flour math

I went through about forty kilos of flour, and roughly a third of that went into the bin as discard. There are things to do with discard — crackers, pancakes — and I did them for about three weeks before I stopped pretending I would keep doing them.

## What actually kept me going

It was not the bread. It was that the starter is the one thing in my kitchen that is alive and responds to attention on a timescale I can perceive. Feed it well for a week and it visibly rewards you. That is a rare feeling and it has almost nothing to do with baking. If you want good bread, buy good bread. If you want a small living thing to be responsible for, the starter is cheaper than a dog.`,
    question: 'Is keeping a sourdough starter actually worth it?',
  },
  {
    essay: `Title: What Keeps a Community Radio Station On Air

# What Keeps a Community Radio Station On Air

I volunteered at a 200-watt station for two years. Almost none of it was talking into a microphone.

## The transmitter

Ours sat on a hill forty minutes away in a shed we rented for sixty dollars a month. Someone had to drive up when it faulted, which was usually in weather bad enough to cause the fault. The licence requires you to keep it within tolerance, and proving that means logs nobody wants to keep.

## The music library

Thirty thousand tracks, catalogued by six different people over fifteen years using six different schemes. A song was findable if you knew which era of volunteer had filed it.

## Money

Underwriting spots, two pledge drives a year, and a grant that covered about a fifth of the budget and required a report that took longer to write than the grant was worth. Rent on the studio was the single biggest line, well ahead of anything technical.

## The schedule

Ninety hours a week of live programming from people with day jobs. The hardest recurring problem at the station was not equipment or money. It was that Tuesday at 6am needed a human being in a chair, every Tuesday, forever, and the person who filled that slot eventually moved or burned out.

## What it adds up to

A radio station sounds like one thing — a voice coming out of a speaker. It is actually a transmitter, a licence, a filing system, a landlord, a grant report, and about forty people's Tuesdays, all of which have to hold at once.`,
    question: 'What are all the pieces that keep a radio station on air?',
  },
]

async function summarize(text, title) {
  const generate = await getGenerator()

  // Demonstrations run as real turns — as inert system-prompt text the model
  // matched their format but drifted back to twenty-word compound questions.
  // The cost of turns is that it reads them as history and bleeds their topics
  // in (an essay once came back asking about sourdough), so the system prompt
  // disclaims them and the final turn repeats the fence.
  const messages = [
    {
      role: 'system',
      content:
        'You read an essay and reply with the one plain question the whole essay sets out to answer. ' +
        'Keep it under twelve words, the way a curious person would ask it out loud. Plain words, no ' +
        'jargon, no "and" joining two questions together. Never quote a section heading or ask about ' +
        'one detail. Reply with only that question, ending in a question mark.\n\n' +
        'The first few essays are worked examples, shown only for length and plainness. Their ' +
        'subjects are unrelated to the real essay, and no topic from them may appear in your answer.',
    },
    ...fewShot.flatMap(({ essay, question }) => [
      { role: 'user', content: essay },
      { role: 'assistant', content: question },
    ]),
    {
      role: 'user',
      content: `Here is the real essay. Use only its own subject matter.\n\nTitle: ${title}\n\n${text}`,
    },
  ]

  const output = await generate(messages, {
    max_new_tokens: 64,
    do_sample: false, // greedy, so a rerun reproduces the committed file
    return_full_text: false,
  })

  const generated = output[0].generated_text
  const reply = Array.isArray(generated)
    ? generated.at(-1).content
    : String(generated)

  const question = extractQuestion(reply)
  if (!question) {
    throw new Error(`no question found in model output: ${JSON.stringify(reply.slice(0, 200))}`)
  }
  return question
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
  const failures = []

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

      if (summaries[slug] && !force) {
        console.log(`⏭ ${dir}/${f}: already has summary, skipped`)
        skippedCount++
        continue
      }

      const filePath = path.join(dirPath, f)
      const raw = await fs.readFile(filePath, 'utf8')
      const { data, content } = matter(raw)
      // Keep the heading structure — the whole essay goes in, and the shape
      // helps the model see the arc instead of the first thing it reads.
      const text = content.replace(/\n{3,}/g, '\n\n').trim()

      try {
        const summary = await summarize(text, data.title || slug)
        summaries[slug] = summary
        console.log(`✓ ${dir}/${f}: ${summary}`)
        newCount++
      } catch (err) {
        // Never write a placeholder — a bad summary renders on the site and
        // then gets skipped forever by the check above.
        console.error(`✗ ${dir}/${f}: ${err.message}`)
        failures.push(`${dir}/${f}`)
      }
    }
  }

  console.log(`\nGenerated ${newCount} new summaries, skipped ${skippedCount} existing`)

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify(summaries, null, 2) + '\n', 'utf8')
  console.log('Wrote summaries to', outPath)

  if (failures.length) {
    console.error(`\nFailed to summarize: ${failures.join(', ')}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
