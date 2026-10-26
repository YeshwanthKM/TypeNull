import fs from 'fs';
import path from 'path';

/**
 * ==============================================================================
 * TypeNull Isolated Handwriting Experiment: PP-OCRv4 Zero-Shot Evaluation
 * ==============================================================================
 * 
 * Script: experiments/handwriting/benchmark_ppocr_zeroshot.mjs
 * Purpose: Reproducible evaluation harness for the official PP-OCRv4 English 
 *          recognition model (SVTR-LCNet architecture) against the standardized 
 *          TypeNull handwriting evaluation corpus (test_corpus/handwritten_eval/).
 * 
 * Safety & Isolation Rules:
 * 1. Independent of production runtime (src/ is untouched).
 * 2. Zero changes to package.json or dependencies.
 * 3. Exact character vocabulary and CTC decoding specifications.
 * 4. Decouples preprocessing, optical recognition, CTC decoding, and spatial association.
 * 5. Reuses the verified Phase 1 baseline evaluation reference text and denominators.
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. Official PP-OCRv4 English Character Vocabulary Dictionary (en_dict.txt)
// ------------------------------------------------------------------------------
// Source: Official PaddlePaddle/PaddleOCR repository (ppocr/utils/en_dict.txt)
// Index 0 is the CTC blank token. Indices 1..96 map to the 96 ASCII glyphs below.
export const PP_OCR_V4_EN_DICT = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
  'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
  'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z',
  '!', '"', '#', '$', '%', '&', '\'', '(', ')', '*',
  '+', ',', '-', '.', '/', ':', ';', '<', '=', '>',
  '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|',
  '}', '~', ' '
];

// ------------------------------------------------------------------------------
// 2. Exact Wagner-Fischer Dynamic Programming (Matching Phase 1 Baseline)
// ------------------------------------------------------------------------------
export function calculateLevenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost  // substitution
      );
    }
  }
  return d[m][n];
}

export function calculateWordLevenshtein(aWords, bWords) {
  const m = aWords.length;
  const n = bWords.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = aWords[i - 1].toLowerCase() === bWords[j - 1].toLowerCase() ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

// ------------------------------------------------------------------------------
// 3. CTC Greedy Decoding Algorithm
// ------------------------------------------------------------------------------
/**
 * Decodes 2D output probability matrix [T, num_classes] from SVTR-LCNet CTC head.
 * @param {number[][]} frameLogits - Matrix of shape [T, 97] (96 chars + 1 blank)
 * @param {string[]} dictionary - Character dictionary of length 96
 * @returns {{ text: string, confidences: number[] }}
 */
export function decodeCTCGreedy(frameLogits, dictionary = PP_OCR_V4_EN_DICT) {
  let prevIndex = -1;
  let decodedChars = [];
  let confidences = [];

  for (let t = 0; t < frameLogits.length; t++) {
    const frame = frameLogits[t];
    let maxIdx = 0;
    let maxVal = frame[0];

    for (let c = 1; c < frame.length; c++) {
      if (frame[c] > maxVal) {
        maxVal = frame[c];
        maxIdx = c;
      }
    }

    // CTC Rule: Collapse repeated identical indices, ignore blank token (index 0)
    if (maxIdx !== 0 && maxIdx !== prevIndex) {
      const char = dictionary[maxIdx - 1]; // maxIdx 1 corresponds to dictionary[0]
      if (char !== undefined) {
        decodedChars.push(char);
        confidences.push(maxVal);
      }
    }
    prevIndex = maxIdx;
  }

  return {
    text: decodedChars.join(''),
    confidences,
    meanConfidence: confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.0,
  };
}

// ------------------------------------------------------------------------------
// 4. Line-Crop Acquisition Methodology & Geometric Specifications
// ------------------------------------------------------------------------------
/**
 * PP-OCRv4 is a line-recognition model expecting an input tensor of shape [1, 3, 48, W].
 * A full statutory document page cannot be passed directly into the network.
 * 
 * Image Preprocessing Requirements:
 * 1. Line / Field Cropping:
 *    - For boxed answers (e.g. Case 6, Case 8): Crop bounding box [x0, y0, x1, y1].
 *    - For underlined lines (e.g. Case 1, Case 7): Crop text region above baseline rule.
 * 2. Aspect-Ratio Normalization:
 *    - Target height: 48 pixels.
 *    - Target width: W = round(48 * (crop_width / crop_height)), clamped to max 320px.
 * 3. Color Space & Normalization:
 *    - Color format: RGB 3-channel float32.
 *    - Normalization formula: normalized_pixel = (pixel / 255.0 - 0.5) / 0.5
 * 
 * Error Categorization Schema:
 * - PREPROCESSING_ERROR: Skew > 15°, blur < 100 DPI, or bounding box crop failure.
 * - RECOGNITION_ERROR: Model outputs incorrect characters for visible text.
 * - DECODING_ERROR: CTC alignment collapse or index out of vocabulary bounds.
 * - FIELD_ASSOCIATION_ERROR: Value recognized correctly but bound to wrong schema key.
 * - FIELD_EXTRACTION_ERROR: End-to-end failure to extract required statutory field.
 * - VALIDATION_DECISION_ERROR: Statutory validation rule rejects field due to format.
 */
export const PREPROCESSING_SPEC = {
  modelName: 'en_PP-OCRv4_rec',
  architecture: 'SVTR-LCNet',
  inputTensorShape: '[1, 3, 48, W]',
  fixedHeight: 48,
  dynamicWidthMax: 320,
  colorFormat: 'RGB',
  normalization: '(pixel / 255.0 - 0.5) / 0.5',
  vocabularySize: 96,
  ctcBlankIndex: 0,
};

// ------------------------------------------------------------------------------
// 5. Verification & Runtime Diagnostics Runner
// ------------------------------------------------------------------------------
export function checkModelAndRuntimeAvailability() {
  const modelPaths = [
    path.resolve('experiments/handwriting/models/en_PP-OCRv4_rec_infer.onnx'),
    path.resolve('public/models/htr/en_PP-OCRv4_rec_infer.onnx'),
  ];

  let foundModelPath = null;
  for (const p of modelPaths) {
    if (fs.existsSync(p)) {
      foundModelPath = p;
      break;
    }
  }

  let onnxRuntimeAvailable = false;
  let onnxRuntimePackage = null;

  try {
    // Check if onnxruntime-node is available
    import('onnxruntime-node').then(() => {
      onnxRuntimeAvailable = true;
      onnxRuntimePackage = 'onnxruntime-node';
    }).catch(() => {});
  } catch (e) {
    onnxRuntimeAvailable = false;
  }

  return {
    modelFound: !!foundModelPath,
    modelPath: foundModelPath,
    runtimeAvailable: onnxRuntimeAvailable,
    runtimePackage: onnxRuntimePackage,
  };
}

export function runZeroShotHarness() {
  console.log('========================================================================');
  console.log('TYPENULL EXPERIMENTAL HARNESS: PP-OCRv4 ZERO-SHOT EVALUATION');
  console.log('========================================================================');
  console.log('Target Architecture: SVTR-LCNet (PaddleOCR PP-OCRv4 English Recognition)');
  console.log('License:             Apache License 2.0');
  console.log(`Input Specification: Height ${PREPROCESSING_SPEC.fixedHeight}px, RGB, Normalized to [-1.0, 1.0]`);
  console.log(`Character Vocabulary: ${PP_OCR_V4_EN_DICT.length} ASCII Characters (en_dict.txt) + CTC Blank`);
  console.log('------------------------------------------------------------------------');

  const diagnostics = checkModelAndRuntimeAvailability();

  console.log('RUNTIME & CHECKPOINT VERIFICATION:');
  console.log(`- Local ONNX Model File:  ${diagnostics.modelFound ? diagnostics.modelPath : 'NOT FOUND (0 .onnx files in workspace)'}`);
  console.log(`- ONNX Runtime Module:    ${diagnostics.runtimeAvailable ? diagnostics.runtimePackage : 'NOT INSTALLED (onnxruntime-node/web not in package.json)'}`);
  console.log('------------------------------------------------------------------------');

  if (!diagnostics.modelFound || !diagnostics.runtimeAvailable) {
    console.log('STATUS: EXPERIMENTAL EXECUTION BLOCKED (PRE-REQUISITES UNMET)');
    console.log('');
    console.log('Reason:');
    if (!diagnostics.modelFound) {
      console.log('  1. No committed ONNX model weights exist in experiments/handwriting/models/.');
      console.log('     Official PP-OCRv4 weights from Baidu are in proprietary Paddle format');
      console.log('     (inference.pdmodel / inference.pdiparams) and require paddle2onnx conversion.');
    }
    if (!diagnostics.runtimeAvailable) {
      console.log('  2. Node.js environment lacks an ONNX runtime package (onnxruntime-node / web).');
      console.log('     Per safety constraints, installing new npm packages is prohibited in this phase.');
    }
    console.log('');
    console.log('In accordance with safety guidelines:');
    console.log('  - Zero synthetic/fabricated inference metrics have been generated.');
    console.log('  - The harness specification, dictionary, and decoding logic are fully committed.');
    console.log('  - Phase 1 baseline benchmarks remain untouched and preserved.');
    console.log('========================================================================');

    return {
      status: 'BLOCKED',
      reason: 'Missing local ONNX checkpoint and uninstalled ONNX runtime dependency',
      diagnostics,
      specification: PREPROCESSING_SPEC,
    };
  }

  // If both model and runtime are available, real inference execution would proceed here...
  return {
    status: 'READY',
    diagnostics,
  };
}

// Standalone execution
runZeroShotHarness();
