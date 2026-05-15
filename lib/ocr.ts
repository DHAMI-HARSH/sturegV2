import * as chrono from "chrono-node";
import { fileTypeFromBuffer } from "file-type";
import path from "node:path";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { AppError } from "@/lib/errors";

const OCR_WIDTH = 1600;
const PDF_DENSITY = 200;
const OCR_WHITELIST =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-:.#(), ";
const MAX_DEBUG_TEXT_LENGTH = 1200;
const SLOW_OCR_WARNING_MS = 60000;
const TESSERACT_WORKER_PATH = path.join(
  process.cwd(),
  "node_modules",
  "tesseract.js",
  "src",
  "worker-script",
  "node",
  "index.js",
);
const TESSERACT_CORE_PATH = path.join(process.cwd(), "node_modules", "tesseract.js-core");
const TESSERACT_CACHE_PATH = path.join(process.cwd(), ".tesseract-cache");

const NAME_STOP_WORDS = new Set([
  "NAME", "STUDENT", "DATE", "RECEIPT", "FEE", "SEMESTER",
  "REGISTRATION", "NUMBER", "NO", "DD", "PAYMENT", "AMOUNT",
  "TOTAL", "COURSE", "BRANCH", "YEAR", "COLLEGE", "UNIVERSITY",
  "THE", "AND", "FOR", "OF", "TO", "IN", "IS", "ON",
]);

const NON_STUDENT_NAME_CONTEXT = /(father'?s?\s+name|mother'?s?\s+name|parent'?s?\s+name|guardian'?s?\s+name|\bfather\b|\bmother\b|\bparent\b|\bguardian\b|\bs\/o\b|\bd\/o\b|\bw\/o\b|\bc\/o\b)/i;

const NAME_LABELS = [
  "student'?s?\\s+name",
  "student\\s+name",
  "candidate\\s+name",
  "applicant\\s+name",
  "name\\s+of\\s+student",
  "name\\s+of\\s+candidate",
  "\\bname\\b",
  "\\bnm\\b",
];

function squeezeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePersonName(value: string) {
  return squeezeWhitespace(value.replace(/[^A-Za-z\s.''-]/g, " ").toUpperCase());
}

function tokenizePersonName(value: string) {
  return normalizePersonName(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !NAME_STOP_WORDS.has(token));
}

function uniqueTokens(value: string) {
  return Array.from(new Set(tokenizePersonName(value)));
}

function extractSearchableText(buffer: Buffer) {
  return squeezeWhitespace(
    buffer
      .toString("latin1")
      .replace(/\\r|\\n|\\t/g, " ")
      .replace(/\\([()\\])/g, "$1")
      .replace(/[^\x20-\x7E]+/g, " "),
  );
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

function tokensFuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length > 4 && b.length > 4 && levenshtein(a, b) <= 1) return true;
  return false;
}

function countFuzzyMatchingTokens(source: string[], target: string[]): number {
  return source.filter((item) => target.some((candidate) => tokensFuzzyMatch(item, candidate))).length;
}

function extractLabeledField(text: string, labels: string[], valuePattern: string) {
  for (const label of labels) {
    const regex = new RegExp(
      `(?:${label})\\s*[:#\\-]?\\s*(${valuePattern})(?=\\s{2,}|\\s+[A-Z][A-Za-z'\\-]*\\s*[:#]|$)`,
      "im",
    );
    const match = text.match(regex);
    if (match?.[1]) return squeezeWhitespace(match[1]);
  }

  return null;
}

type NameCandidate = {
  value: string;
  priority: number;
};

function isNonStudentNameContext(value: string) {
  return NON_STUDENT_NAME_CONTEXT.test(value);
}

function pushNameCandidate(candidates: NameCandidate[], value: string, priority: number) {
  const normalized = squeezeWhitespace(value);
  if (!normalized || isNonStudentNameContext(normalized)) {
    return;
  }

  const existing = candidates.find((candidate) => candidate.value === normalized);
  if (existing) {
    existing.priority = Math.max(existing.priority, priority);
    return;
  }

  candidates.push({ value: normalized, priority });
}

function extractLikelyNameCandidates(text: string): NameCandidate[] {
  const candidates: NameCandidate[] = [];
  const labelPattern = NAME_LABELS.join("|");
  const strongLabelPattern = NAME_LABELS.slice(0, 6).join("|");
  const nameValuePattern = "[A-Za-z][A-Za-z\\s.'\\-]{2,80}";
  const labeledName = extractLabeledField(text, NAME_LABELS, nameValuePattern);

  if (labeledName) {
    pushNameCandidate(candidates, labeledName, 5);
  }

  for (const match of text.matchAll(
    new RegExp(`((?:${labelPattern})\\s*[:#\\-]?\\s*([A-Za-z][A-Za-z\\s.'\\-]{2,80}))`, "gim"),
  )) {
    const fullMatch = match[1] ?? "";
    const candidate = match[2] ?? "";
    if (!candidate || isNonStudentNameContext(fullMatch)) {
      continue;
    }

    const priority = new RegExp(`(?:${strongLabelPattern})`, "i").test(fullMatch) ? 6 : 4;
    pushNameCandidate(candidates, candidate, priority);
  }

  const lines = text.split(/\r?\n/).map((line) => squeezeWhitespace(line));
  for (let i = 0; i < lines.length - 1; i++) {
    if (isNonStudentNameContext(lines[i]) || isNonStudentNameContext(lines[i + 1])) {
      continue;
    }

    const isLabel = new RegExp(`^(?:${labelPattern})\\s*[:#\\-]?\\s*$`, "i").test(lines[i]);
    if (isLabel && /^[A-Za-z][A-Za-z\s.'\\-]{2,80}$/.test(lines[i + 1])) {
      const priority = new RegExp(`^(?:${strongLabelPattern})\\s*[:#\\-]?\\s*$`, "i").test(lines[i]) ? 6 : 4;
      pushNameCandidate(candidates, lines[i + 1], priority);
    }
  }

  for (const line of lines) {
    if (line.length < 5 || line.length > 80) continue;
    if (/\d/.test(line)) continue;
    if (isNonStudentNameContext(line)) continue;
    if (!/^[A-Za-z][A-Za-z\s.'\\-]+$/.test(line)) continue;
    const tokens = tokenizePersonName(line);
    if (tokens.length >= 2 && tokens.length <= 5) {
      pushNameCandidate(candidates, line, 1);
    }
  }

  return candidates;
}

function containsExpectedNameFuzzy(text: string, expectedFullName: string): boolean {
  const expectedTokens = uniqueTokens(expectedFullName);
  if (!expectedTokens.length) return false;

  const textTokens = tokenizePersonName(text);
  if (!textTokens.length) return false;

  return expectedTokens.every((expected) => textTokens.some((token) => tokensFuzzyMatch(token, expected)));
}

function isLikelyNameMatch(candidate: string, expectedFullName: string): boolean {
  const expectedTokens = uniqueTokens(expectedFullName);
  const candidateTokens = uniqueTokens(candidate);
  if (!expectedTokens.length || !candidateTokens.length) return false;

  if (
    containsExpectedNameFuzzy(candidate, expectedFullName) ||
    containsExpectedNameFuzzy(expectedFullName, candidate)
  ) {
    return true;
  }

  const overlap = countFuzzyMatchingTokens(expectedTokens, candidateTokens);
  const expectedCoverage = overlap / expectedTokens.length;
  const candidateCoverage = overlap / candidateTokens.length;

  if (expectedTokens.length === 1) return overlap === 1;
  if (expectedTokens.length === 2) {
    return overlap >= 2 || (overlap === 1 && candidateCoverage >= 0.5 && expectedCoverage >= 0.5);
  }

  return overlap >= 2 && (expectedCoverage >= 0.6 || candidateCoverage >= 0.75);
}

function pickBestNameCandidate(candidates: NameCandidate[], expectedFullName: string): string | null {
  const expectedTokens = uniqueTokens(expectedFullName);
  if (!expectedTokens.length) return null;

  let bestCandidate: string | null = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const candidateTokens = uniqueTokens(candidate.value);
    const overlap = countFuzzyMatchingTokens(expectedTokens, candidateTokens);
    const score =
      overlap * 10 +
      candidate.priority * 3 -
      Math.abs(candidateTokens.length - expectedTokens.length);

    if (score > bestScore) {
      bestCandidate = candidate.value;
      bestScore = score;
    }
  }

  return bestCandidate;
}

function matchExpectedStudentName(text: string, expectedFullName: string) {
  const candidates = extractLikelyNameCandidates(text);
  const bestCandidate = pickBestNameCandidate(candidates, expectedFullName);

  if (containsExpectedNameFuzzy(text, expectedFullName)) {
    return {
      detectedName: bestCandidate ?? squeezeWhitespace(expectedFullName),
      matched: true as boolean | null,
    };
  }

  if (!candidates.length) {
    return {
      detectedName: null as string | null,
      matched: null as boolean | null,
    };
  }

  const detectedName = bestCandidate ?? candidates[0]?.value ?? null;
  return {
    detectedName,
    matched: detectedName ? isLikelyNameMatch(detectedName, expectedFullName) : (false as boolean | null),
  };
}

function analyzeReceiptText(text: string, expectedFullName: string) {
  const normalizedText = squeezeWhitespace(text);
  return {
    extractedText: normalizedText,
    date: pickReceiptDate(normalizedText),
    ...matchExpectedStudentName(text, expectedFullName),
  };
}

function hasEnoughReceiptEvidence(analysis: ReturnType<typeof analyzeReceiptText>) {
  return Boolean(analysis.date && analysis.matched !== null);
}

function extractLabeledFieldDate(text: string) {
  return extractLabeledField(
    text,
    ["receipt\\s+date", "\\bdate\\b"],
    "\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4}|\\d{4}[\\/.-]\\d{1,2}[\\/.-]\\d{1,2}|\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4}|[A-Za-z]{3,9}\\s+\\d{1,2},?\\s+\\d{2,4}",
  );
}

function extractLikelyDateSnippets(text: string) {
  const cleaned = text
    .replace(/[|]/g, "/")
    .replace(/[Oo](?=\d)/g, "0")
    .replace(/(?<=\d)[.,](?=\d{2,4}\b)/g, "/")
    .replace(/(?<=\d)\s+(?=\d{1,2}[/-]\d{2,4}\b)/g, "/");

  const regex =
    /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b|\b\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2}\b|\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}\b|\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}\b/g;

  return Array.from(new Set(cleaned.match(regex) ?? []));
}

function pickReceiptDate(text: string): Date | null {
  const labeledDate = extractLabeledFieldDate(text);
  const snippets = extractLikelyDateSnippets(text);
  const referenceDate = new Date();

  const candidates = [
    ...(labeledDate ? chrono.parse(labeledDate, referenceDate, { forwardDate: false }) : []),
    ...snippets.flatMap((snippet) => chrono.parse(snippet, referenceDate, { forwardDate: false })),
  ]
    .filter((entry) => entry.start.isCertain("day"))
    .map((entry) => entry.start.date())
    .filter((date) => {
      const year = date.getFullYear();
      return year >= 2000 && year <= referenceDate.getFullYear() + 1;
    })
    .sort(
      (a, b) =>
        Math.abs(referenceDate.getTime() - a.getTime()) -
        Math.abs(referenceDate.getTime() - b.getTime()),
    );

  return candidates[0] ?? null;
}

async function normalizeImage(buffer: Buffer) {
  return sharp(buffer)
    .removeAlpha()
    .grayscale()
    .normalize()
    .median(1)
    .sharpen()
    .resize({ width: OCR_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();
}

async function thresholdImage(buffer: Buffer) {
  return sharp(buffer)
    .removeAlpha()
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(180)
    .resize({ width: OCR_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();
}

async function contrastImage(buffer: Buffer) {
  return sharp(buffer)
    .removeAlpha()
    .grayscale()
    .normalize()
    .modulate({ brightness: 1.05 })
    .sharpen()
    .resize({ width: OCR_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();
}

async function pdfFirstPageToImage(buffer: Buffer) {
  return sharp(buffer, { density: PDF_DENSITY, page: 0 })
    .flatten({ background: "#ffffff" })
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: OCR_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();
}

type WorkerKey = "restricted" | "full";

const workerPromises: Partial<Record<WorkerKey, Promise<Tesseract.Worker>>> = {};
const workerQueues: Record<WorkerKey, Promise<void>> = {
  restricted: Promise.resolve(),
  full: Promise.resolve(),
};

async function getOcrWorker(key: WorkerKey): Promise<Tesseract.Worker> {
  if (!workerPromises[key]) {
    workerPromises[key] = (async () => {
      const worker = await Tesseract.createWorker("eng", 1, {
        // Next.js can break Tesseract's auto-detection of the worker thread
        // entrypoint. Use explicit local paths to keep resolution stable.
        workerPath: TESSERACT_WORKER_PATH,
        corePath: TESSERACT_CORE_PATH,
        cachePath: TESSERACT_CACHE_PATH,
      });
      if (key === "restricted") {
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_char_whitelist: OCR_WHITELIST,
        });
      } else {
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        });
      }

      return worker;
    })();
  }

  return workerPromises[key]!;
}

async function runQueuedOcr(buffer: Buffer, workerKey: WorkerKey = "restricted"): Promise<string> {
  const previous = workerQueues[workerKey];
  let release!: () => void;
  workerQueues[workerKey] = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;

  try {
    const worker = await getOcrWorker(workerKey);
    const result = await worker.recognize(buffer);
    return result.data.text;
  } finally {
    release();
  }
}

function scoreAnalysis(analysis: ReturnType<typeof analyzeReceiptText>): number {
  let score = 0;
  if (analysis.date) score += 50;
  if (analysis.matched === true) score += 40;
  else if (analysis.matched === null) score += 10;
  if (analysis.detectedName) score += 20;
  return score;
}

interface OcrAttemptResult {
  analysis: ReturnType<typeof analyzeReceiptText>;
  text: string;
  durationMs: number;
  usedFullWorker: boolean;
}

async function runOcrAttempt(
  imageFactory: (buffer: Buffer) => Promise<Buffer>,
  fileBuffer: Buffer,
  expectedFullName: string,
): Promise<OcrAttemptResult> {
  const startedAt = Date.now();
  const processedImage = await imageFactory(fileBuffer);
  const restrictedText = await runQueuedOcr(processedImage, "restricted");
  const restrictedAnalysis = analyzeReceiptText(restrictedText, expectedFullName);

  // The unrestricted worker is significantly slower. Only invoke it when the
  // first pass is still missing either a reliable date or a clear name result.
  if (hasEnoughReceiptEvidence(restrictedAnalysis)) {
    return {
      analysis: restrictedAnalysis,
      text: restrictedText,
      durationMs: Date.now() - startedAt,
      usedFullWorker: false,
    };
  }

  const fullText = await runQueuedOcr(processedImage, "full");
  const mergedText = `${restrictedText}\n${fullText}`;
  const analysis = analyzeReceiptText(mergedText, expectedFullName);
  return {
    analysis,
    text: mergedText,
    durationMs: Date.now() - startedAt,
    usedFullWorker: true,
  };
}

async function extractFromRenderedImage(buffer: Buffer, expectedFullName: string) {
  const attempts: OcrAttemptResult[] = [];
  const timingNotes: string[] = [];

  const normalAttempt = await runOcrAttempt(normalizeImage, buffer, expectedFullName);
  attempts.push(normalAttempt);
  timingNotes.push(
    `normalize=${normalAttempt.durationMs}ms${normalAttempt.usedFullWorker ? " (full)" : ""}`,
  );
  let bestAttempt = normalAttempt;

  if (!hasEnoughReceiptEvidence(bestAttempt.analysis)) {
    const thresholdAttempt = await runOcrAttempt(thresholdImage, buffer, expectedFullName);
    attempts.push(thresholdAttempt);
    timingNotes.push(
      `threshold=${thresholdAttempt.durationMs}ms${thresholdAttempt.usedFullWorker ? " (full)" : ""}`,
    );
    if (scoreAnalysis(thresholdAttempt.analysis) > scoreAnalysis(bestAttempt.analysis)) {
      bestAttempt = thresholdAttempt;
    }
  }

  if (!hasEnoughReceiptEvidence(bestAttempt.analysis)) {
    const contrastAttempt = await runOcrAttempt(contrastImage, buffer, expectedFullName);
    attempts.push(contrastAttempt);
    timingNotes.push(
      `contrast=${contrastAttempt.durationMs}ms${contrastAttempt.usedFullWorker ? " (full)" : ""}`,
    );
    if (scoreAnalysis(contrastAttempt.analysis) > scoreAnalysis(bestAttempt.analysis)) {
      bestAttempt = contrastAttempt;
    }
  }

  const combinedText = Array.from(new Set(attempts.map((attempt) => squeezeWhitespace(attempt.text)).filter(Boolean))).join("\n");
  const combinedAnalysis = analyzeReceiptText(combinedText, expectedFullName);
  const finalAnalysis =
    scoreAnalysis(combinedAnalysis) >= scoreAnalysis(bestAttempt.analysis)
      ? combinedAnalysis
      : bestAttempt.analysis;

  return {
    bestAnalysis: finalAnalysis,
    combinedText,
    timingNotes,
  };
}

function buildOcrDebugText(input: {
  matched: boolean | null;
  detectedName: string | null;
  date: Date | null;
  extractedText: string;
  timingNotes?: string[];
}) {
  return [
    `Detected date: ${input.date ? input.date.toISOString().slice(0, 10) : "not found"}`,
    `Detected name: ${input.detectedName ?? "not found"}`,
    `Name matched: ${input.matched === true ? "yes" : input.matched === false ? "no" : "uncertain"}`,
    ...(input.timingNotes?.length ? [`OCR timing: ${input.timingNotes.join(" | ")}`] : []),
    `OCR text: ${input.extractedText || "none"}`,
  ]
    .join("\n")
    .slice(0, MAX_DEBUG_TEXT_LENGTH);
}

export async function extractReceiptInsights(input: {
  expectedFullName: string;
  fileBuffer: Buffer;
  uploadedUrl: string;
  previewUrl?: string;
}) {
  const startedAt = Date.now();
  const type = await fileTypeFromBuffer(input.fileBuffer);
  const isPdf = type?.mime === "application/pdf" || input.uploadedUrl.endsWith(".pdf");
  const timingNotes: string[] = [];

  const rawStartedAt = Date.now();
  const rawText = extractSearchableText(input.fileBuffer);
  const rawAnalysis = analyzeReceiptText(rawText, input.expectedFullName);
  timingNotes.push(`raw=${Date.now() - rawStartedAt}ms`);

  if (hasEnoughReceiptEvidence(rawAnalysis)) {
    timingNotes.push(`total=${Date.now() - startedAt}ms`);
    return {
      ...rawAnalysis,
      ocrDebugText: buildOcrDebugText({
        ...rawAnalysis,
        timingNotes,
      }),
    };
  }

  const ocrTexts: string[] = [];
  let bestAnalysis = rawAnalysis;

  async function processImageBuffer(imageBuffer: Buffer) {
    const rendered = await extractFromRenderedImage(imageBuffer, input.expectedFullName);
    bestAnalysis = rendered.bestAnalysis;
    ocrTexts.push(rendered.combinedText);
    timingNotes.push(...rendered.timingNotes);
  }

  if (isPdf) {
    const renderStartedAt = Date.now();
    try {
      const renderedPdf = await pdfFirstPageToImage(input.fileBuffer);
      timingNotes.push(`pdf-render=${Date.now() - renderStartedAt}ms`);
      await processImageBuffer(renderedPdf);
    } catch {
      if (!input.previewUrl) {
        throw new AppError("Could not render the uploaded PDF for OCR.", 400);
      }

      const previewStartedAt = Date.now();
      const previewResponse = await fetch(input.previewUrl);
      if (!previewResponse.ok) {
        throw new AppError("Could not fetch the receipt preview for OCR.", 400);
      }

      timingNotes.push(`pdf-preview-fetch=${Date.now() - previewStartedAt}ms`);
      await processImageBuffer(Buffer.from(await previewResponse.arrayBuffer()));
    }
  } else {
    await processImageBuffer(input.fileBuffer);
  }

  const combinedText = Array.from(new Set(ocrTexts.map(squeezeWhitespace).filter(Boolean))).join("\n");
  timingNotes.push(`total=${Date.now() - startedAt}ms`);
  if (Date.now() - startedAt > SLOW_OCR_WARNING_MS) {
    timingNotes.push("warning=slow-ocr");
  }
  const result = {
    ...bestAnalysis,
    extractedText: combinedText || bestAnalysis.extractedText,
    ocrDebugText: buildOcrDebugText({
      ...bestAnalysis,
      extractedText: combinedText || bestAnalysis.extractedText,
      timingNotes,
    }),
  };

  if (!result.date) {
    throw new AppError("Could not detect a valid receipt date on the uploaded file.", 400);
  }

  return result;
}
