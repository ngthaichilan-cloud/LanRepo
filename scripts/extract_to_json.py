import sys
from pathlib import Path
from pdfminer.high_level import extract_text
import json

def main(pdf_path: str, out_path: str):
    pdf = Path(pdf_path)
    out = Path(out_path)
    if not pdf.is_file():
        print(f"PDF not found: {pdf}")
        sys.exit(1)
    text = extract_text(str(pdf))
    data = {"text": text}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Extracted text written to {out}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python extract_to_json.py <input.pdf> <output.json>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
