// pdf_to_json.js – extracts content from Tiếng Anh 9 Global Success PDF
// ---------------------------------------------------------------
// This script uses the `pdf-parse` library (installed via npm) to read the PDF.
// It writes three JSON files into the project's `data/` directory:
//   - vocab_global.json   : [{ word: "...", translation: "..." }, ...]
//   - grammar_global.json : [{ sentence: "...", missingWord: "...", options: ["...", "..."] }, ...]
//   - reading_global.json : [{ passage: "...", questions: [{ question: "...", options: ["..."], answer: "..." }, ...] }, ...]
//
// Because the PDF structure varies, the script uses very simple heuristics:
//   * Lines that contain a dash (" - ") are treated as "word – translation".
//   * Lines that end with a question mark are stored as reading passages.
//   * Other lines are ignored for now.
// This provides a starter dataset that can be refined later.
// ---------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfPath = path.resolve('Tiếng Anh 9 Global Success.pdf');
const dataDir = path.resolve('data');

if (!fs.existsSync(pdfPath)) {
  console.error('PDF file not found at', pdfPath);
  process.exit(1);
}

const pdfBuffer = fs.readFileSync(pdfPath);

pdf(pdfBuffer).then(function (data) {
  const text = data.text; // whole extracted text
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  const vocab = [];
  const grammar = [];
  const reading = [];

  let currentPassage = '';
  const passageQuestions = [];

  lines.forEach(line => {
    // Simple heuristic for vocab: "word - meaning"
    if (line.includes(' - ')) {
      const [word, translation] = line.split(' - ').map(s => s.trim());
      if (word && translation) {
        vocab.push({ word, translation });
        return;
      }
    }

    // Simple heuristic for grammar sentences: contains a blank (___) for missing word
    if (line.includes('___')) {
      // Expect format: Sentence ___ missingWord [opt1,opt2,...]
      const parts = line.split('___');
      const sentence = parts[0].trim();
      const rest = parts[1].trim();
      // try to extract missing word and options from rest
      const match = rest.match(/^(\w+)\s*\[(.+)\]$/);
      if (match) {
        const missingWord = match[1];
        const options = match[2].split(',').map(o => o.trim().replace(/^'|"|`$/g, ''));
        grammar.push({ sentence, missingWord, options });
        return;
      }
    }

    // Collect reading passages – any line ending with a question mark or period can be a passage starter
    if (line.endsWith('?') || line.endsWith('.')) {
      // When we encounter a new passage, push the previous one if any
      if (currentPassage) {
        reading.push({ passage: currentPassage, questions: passageQuestions.splice(0) });
        currentPassage = '';
      }
      currentPassage = line;
    } else {
      // treat as continuation of passage
      if (currentPassage) currentPassage += ' ' + line;
    }
  });

  // push final passage
  if (currentPassage) {
    reading.push({ passage: currentPassage, questions: passageQuestions });
  }

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Write JSON files (pretty‑printed for readability)
  fs.writeFileSync(path.join(dataDir, 'vocab_global.json'), JSON.stringify(vocab, null, 2), 'utf8');
  fs.writeFileSync(path.join(dataDir, 'grammar_global.json'), JSON.stringify(grammar, null, 2), 'utf8');
  fs.writeFileSync(path.join(dataDir, 'reading_global.json'), JSON.stringify(reading, null, 2), 'utf8');

  console.log('✅ Extraction complete. Files written to', dataDir);
  // Combined dataset for the game
  const combined = { vocab, grammar, reading };
  fs.writeFileSync(path.join(dataDir, 'game_data.json'), JSON.stringify(combined, null, 2), 'utf8');
}).catch(err => {
  console.error('Error parsing PDF:', err);
  process.exit(1);
});
