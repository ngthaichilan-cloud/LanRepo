import sys
import json
from pathlib import Path
import pdfplumber
from PyPDF2 import PdfReader
from pdf2image import convert_from_path
import pytesseract

def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract raw text from the PDF.
    Attempts:
    1. pdfplumber (high fidelity)
    2. PyPDF2 fallback
    3. OCR via pdf2image + pytesseract if no text is found.
    """
    # First try pdfplumber
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
            text = "\n".join(pages_text).strip()
            if text:
                return text
    except Exception as e:
        print(f"pdfplumber error ({e}), proceeding to next method")

    # Fallback to PyPDF2
    try:
        reader = PdfReader(str(pdf_path))
        pages_text = []
        for page in reader.pages:
            try:
                txt = page.extract_text()
            except Exception:
                txt = ""
            if txt:
                pages_text.append(txt)
        text = "\n".join(pages_text).strip()
        if text:
            return text
    except Exception as e:
        print(f"PyPDF2 error ({e}), proceeding to OCR")

    # OCR fallback using pdf2image and pytesseract
    try:
        images = convert_from_path(str(pdf_path))
        ocr_texts = [pytesseract.image_to_string(img) for img in images]
        return "\n".join(ocr_texts).strip()
    except Exception as e:
        print(f"OCR extraction failed: {e}")
        return ""

def split_into_sections(text: str) -> list:
    """Split extracted text into sections based on double newlines."""
    raw_sections = [s.strip() for s in text.split("\n\n") if s.strip()]
    return raw_sections

def main(pdf_file: str, json_file: str):
    pdf_path = Path(pdf_file)
    json_path = Path(json_file)
    if not pdf_path.is_file():
        print(f"PDF file not found: {pdf_path}")
        sys.exit(1)
    text = extract_text_from_pdf(pdf_path)
    sections = split_into_sections(text)
    # Output both full text and sections
    data = {"text": text, "sections": sections}
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Extracted {len(sections)} sections and full text to {json_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python extract_pdf.py <input.pdf> <output.json>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
