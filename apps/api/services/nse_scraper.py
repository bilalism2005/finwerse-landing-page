import httpx
import logging
import fitz  # PyMuPDF
from datetime import datetime
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from fake_useragent import UserAgent
import models

logger = logging.getLogger(__name__)

class NSEFilingsScraper:
    def __init__(self, db: Session):
        self.db = db
        self.base_url = "https://www.nseindia.com"
        self.api_url = "https://www.nseindia.com/api/corporate-announcements?index=equities"
        
        ua = UserAgent()
        self.headers = {
            "User-Agent": ua.random,
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive"
        }
        self.client = httpx.Client(headers=self.headers, timeout=30.0)
        
        # Initialize text splitter and embedding model
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        # Load embedding model locally
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

    def _establish_session(self):
        """Hit the homepage to get the required session cookies."""
        logger.info("Establishing NSE session cookies...")
        try:
            self.client.get(self.base_url)
            logger.info("Session established.")
        except Exception as e:
            logger.error(f"Failed to establish NSE session: {e}")

    def fetch_latest_announcements(self):
        """Fetch the latest JSON announcements feed."""
        try:
            response = self.client.get(self.api_url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch announcements API: {e}")
            return []

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text using PyMuPDF. Ignores image-based PDFs."""
        text = ""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text("text") + "\n"
            doc.close()
        except Exception as e:
            logger.error(f"Failed to parse PDF: {e}")
            
        if len(text.strip()) < 50:
            logger.warning("PDF extracted < 50 chars. It might be a scanned image. OCR is disabled.")
            
        return text

    def process_announcements(self):
        self._establish_session()
        announcements = self.fetch_latest_announcements()
        
        if not announcements:
            logger.info("No announcements found or failed to fetch.")
            return

        # Fetch our universe of active stocks
        valid_symbols = {
            mapping.stock_symbol 
            for mapping in self.db.query(models.SymbolMapping).all()
        }
        
        processed_count = 0

        for item in announcements:
            symbol = item.get("symbol")
            if not symbol or symbol not in valid_symbols:
                continue
                
            attachment_url = item.get("attchmntFile") or item.get("attachment")
            if not attachment_url:
                continue
                
            # Ensure URL is absolute
            if not attachment_url.startswith("http"):
                attachment_url = f"https://www.nseindia.com{attachment_url}"
                
            # Deduplication: Check if we already processed this filing URL
            existing = self.db.query(models.CorporateFiling.id).filter(
                models.CorporateFiling.source_url == attachment_url
            ).first()
            
            if existing:
                continue
                
            # Parse filing date from an_dt (e.g. "18-Aug-2026 19:05:30") or anndate
            date_str = item.get("an_dt") or item.get("anndate") or item.get("sort_date") or ""
            filing_date = datetime.now()
            if date_str:
                for fmt in ["%d-%b-%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d-%b-%Y"]:
                    try:
                        filing_date = datetime.strptime(date_str, fmt)
                        break
                    except Exception:
                        pass
                
            desc = item.get("desc") or item.get("smIndustry") or "General Announcement"
            attch_summary = item.get("attchmntText", "").strip()

            # Attempt PDF download for in-depth text
            raw_text = attch_summary
            logger.info(f"Processing announcement for {symbol}: {desc}")
            try:
                pdf_response = self.client.get(attachment_url, timeout=15.0)
                if pdf_response.status_code == 200:
                    extracted = self.extract_text_from_pdf(pdf_response.content)
                    if extracted and len(extracted.strip()) > 50:
                        raw_text = f"{attch_summary}\n\n{extracted}".strip()
            except Exception as e:
                logger.warning(f"PDF download skipped for {attachment_url}: {e}")

            if not raw_text.strip():
                continue
                
            # Chunk Text
            raw_chunks = self.text_splitter.split_text(raw_text)
            chunks = [c for c in raw_chunks if c.strip()]
            
            if not chunks:
                chunks = [raw_text[:1000]]
            
            # Save filings to database
            db_objects = []
            for chunk_text in chunks[:5]:  # Limit top 5 chunks per filing
                db_filing = models.CorporateFiling(
                    stock_symbol=symbol,
                    filing_type=desc[:50],
                    filing_date=filing_date,
                    source_url=attachment_url,
                    chunk_text=chunk_text
                )
                db_objects.append(db_filing)
                
            self.db.bulk_save_objects(db_objects)
            self.db.commit()
            
            processed_count += 1
            logger.info(f"Successfully processed {symbol} filing. Stored {len(db_objects)} chunks.")
            
        logger.info(f"NSE Scraper complete. Processed {processed_count} new filings.")
