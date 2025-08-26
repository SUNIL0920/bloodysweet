import fs from 'fs'
import zlib from 'zlib'
import { createRequire } from 'module'

// Lazy import to avoid requiring key if not configured
let genAI = null
let fileManager = null
let pdfParse = null
function getGenAI() {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  if (!genAI) {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    genAI = new GoogleGenerativeAI(key)
    try {
      const { GoogleAIFileManager } = require('@google/generative-ai/server')
      fileManager = new GoogleAIFileManager(key)
    } catch {}
  }
  return genAI
}

function toTextSafe(buf) {
  try { return buf.toString('utf8') } catch { return '' }
}

export async function extractTextFromFile(localPath, mimeType) {
  try {
    const data = fs.readFileSync(localPath)
    if ((mimeType || '').includes('pdf') || localPath.toLowerCase().endsWith('.pdf')) {
      // Fast-path for ASCII85 + Flate encoded text streams (common in tiny PDFs)
      try {
        const raw = data.toString('latin1')
        if (/ASCII85Decode/.test(raw) && /FlateDecode/.test(raw)) {
          const streamMatch = raw.match(/stream\r?\n([\s\S]*?)endstream/)
          if (streamMatch) {
            const ascii85 = streamMatch[1].trim()
            const decoded = ascii85Decode(ascii85)
            const inflated = zlib.inflateSync(Buffer.from(decoded))
            const text = inflated.toString('utf8')
            if (text && /[A-Za-z]/.test(text)) return text
          }
        }
      } catch {}
      // Attempt extraction via PDF.js (legacy build for Node)
      try {
        const require = createRequire(import.meta.url)
        const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
        pdfjs.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js')
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) })
        const pdf = await loadingTask.promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          fullText += content.items.map(it => it.str || '').join(' ') + '\n'
        }
        if (fullText.trim().length > 0) return fullText
      } catch {}
      // Fallback to pdf-parse
      try {
        if (!pdfParse) {
          const require = createRequire(import.meta.url)
          pdfParse = require('pdf-parse/lib/pdf-parse.js')
        }
        const parsed = await pdfParse(data)
        return parsed.text || ''
      } catch {}
      // Final fallback: scan raw buffer as latin1 text for ASCII labels
      try {
        const ascii = data.toString('latin1')
          .replace(/[^\x20-\x7E\n\r]+/g, ' ')
        if (ascii.trim().length > 0) return ascii
      } catch {}
      return ''
    }
    return toTextSafe(data)
  } catch { return '' }
}

// Minimal ASCII85 decoder supporting 'z' shortcut and '~>' terminator
function ascii85Decode(input) {
  const out = []
  let tuple = 0
  let count = 0
  const bytes = []
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (c === '\n' || c === '\r' || c === '\t' || c === ' ') continue
    if (c === '~') break
    if (c === 'z' && count === 0) { bytes.push(0,0,0,0); continue }
    const code = c.charCodeAt(0) - 33
    if (code < 0 || code > 84) continue
    tuple = tuple * 85 + code
    count++
    if (count === 5) {
      out.push((tuple >>> 24) & 0xFF, (tuple >>> 16) & 0xFF, (tuple >>> 8) & 0xFF, tuple & 0xFF)
      tuple = 0
      count = 0
    }
  }
  if (count > 0) {
    for (let i = count; i < 5; i++) tuple = tuple * 85 + 84
    for (let i = 0; i < count - 1; i++) {
      out.push((tuple >>> (24 - 8*i)) & 0xFF)
    }
  }
  return Uint8Array.from(out)
}

// Simple field validators by type
function expectedFieldsFor(type) {
  switch (type) {
    case 'license':
      return ['License Number', 'Issued To', 'Address', 'Valid From', 'Valid Till']
    case 'registrationProof':
      return ['Registration ID', 'Registered Name', 'Address', 'Date of Registration']
    case 'authorityLetter':
      return ['Authorized', 'Authorized By', 'Designation', 'Date']
    case 'accreditation':
      return ['Certificate', 'Awarded To', 'Accreditation Body', 'Validity']
    default:
      return []
  }
}

function simpleRegexCheck(text, fields) {
  const present = []
  const missing = []
  for (const f of fields) {
    const re = new RegExp(f.replace(/[^a-z0-9]/gi, '.{0,5}'), 'i')
    if (re.test(text)) present.push(f)
    else missing.push(f)
  }
  return { present, missing }
}

export async function analyzeDocument({ type, localPath, mimeType }) {
  const text = await extractTextFromFile(localPath, mimeType)
  const fields = expectedFieldsFor(type)
  const regexResult = simpleRegexCheck(text, fields)

  // Default verdict from regex
  let verdict = regexResult.missing.length === 0 ? 'pass' : (regexResult.present.length > 0 ? 'partial' : 'fail')
  let aiSummary = ''

  // Try Gemini for a better summary if configured (plain text only)
  try {
    const api = getGenAI()
    if (api) {
      const model = api.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const prompt = `You are validating a hospital verification document of type ${type}. Given ONLY the plain text extracted from the PDF, extract the required fields (${expectedFieldsFor(type).join(', ')}). Minor variations are okay (e.g., 'Issued To' vs 'Issued to'). Return STRICT JSON only: {fields: {...}, missing: [..], verdict: "pass|partial|fail"}.`
      const resp = await model.generateContent([{ text: prompt }, { text: text || '(no text extracted)' }])
      const out = resp?.response?.text?.() || ''
      try {
        const parsed = JSON.parse(out.trim())
        aiSummary = out
        if (parsed?.verdict) verdict = parsed.verdict
      } catch {
        aiSummary = out
      }
    }
  } catch {}

  return {
    textPreview: (text || '').slice(0, 2000),
    fieldsExpected: fields,
    regex: regexResult,
    verdict,
    aiSummary
  }
}


