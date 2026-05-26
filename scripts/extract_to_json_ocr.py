import sys
from pathlib import Path
import json
from pdfminer.high_level import extract_text as pdfminer_extract
import fitz  # PyMuPDF
import pytesseract

def ocr_page(page):
    # Render page to PNG bytes
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # increase resolution
    img_bytes = pix.tobytes("png")
    # Use pytesseract to extract text from image bytes
    # pytesseract can accept a Pillow Image; we create via BytesIO
    from io import BytesIO
    from PIL import Image
    image = Image.open(BytesIO(img_bytes))
    return pytesseract.image_to_string(image, lang='eng')

def extract_text_with_fallback(pdf_path: Path) -> str:
    # First try pdfminer
    try:
        text = pdfminer_extract(str(pdf_path)).strip()
        if text:
            return text
    except Exception as e:
        print(f"pdfminer failed: {e}")
    # Fallback to OCR via PyMuPDF
    try:
        doc = fitz.open(str(pdf_path))
        ocr_texts = []
        for page in doc:
            ocr_texts.append(ocr_page(page))
        return "\n".join(ocr_texts).strip()
    except Exception as e:
        print(f"OCR fallback failed: {e}")
    return ""

def main(pdf_file: str, json_file: str):
    pdf_path = Path(pdf_file)
    out_path = Path(json_file)
    if not pdf_path.is_file():
        print(f"PDF not found: {pdf_path}")
        sys.exit(1)
    text = extract_text_with_fallback(pdf_path)
    data = {"text": text}
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Extracted text written to {out_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python extract_to_json_ocr.py <input.pdf> <output.json>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
