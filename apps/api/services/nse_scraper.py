import os
import httpx
import logging
import fitz  # PyMuPDF
from io import BytesIO
from datetime import datetime
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
import models

logger = logging.getLogger(__name__)

class NSEFilingsScraper:
    def __init__(self, db: Session):
        self.db = db
        self.base_url = "https://www.nseindia.com"
        self.api_url = "https://www.nseindia.com/api/corporate-announcements?index=equities"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
                
            attachment_url = item.get("attachment")
            if not attachment_url:
                continue
                
            # Ensure URL is absolute
            if not attachment_url.startswith("http"):
                attachment_url = f"https://www.nseindia.com{attachment_url}"
                
            # Deduplication: Check if we already processed this filing URL
            existing = self.db.query(models.CorporateFiling).filter(
                models.CorporateFiling.source_url == attachment_url
            ).first()
            
            if existing:
                continue
                
            # Parse filing date
            date_str = item.get("anndate") # e.g. "16-Aug-2026 15:30:00"
            try:
                # NSE format varies slightly, try standard
                filing_date = datetime.strptime(date_str, "%d-%b-%Y %H:%M:%S")
            except Exception:
                filing_date = datetime.now()
                
            desc = item.get("desc", "General")

            # Download PDF
            logger.info(f"Downloading PDF for {symbol}: {attachment_url}")
            try:
                pdf_response = self.client.get(attachment_url)
                pdf_response.raise_for_status()
                pdf_bytes = pdf_response.content
            except Exception as e:
                logger.error(f"Failed to download PDF {attachment_url}: {e}")
                continue
                
            # Extract Text
            raw_text = self.extract_text_from_pdf(pdf_bytes)
            if not raw_text.strip():
                continue
                
            # Chunk Text
            chunks = self.text_splitter.split_text(raw_text)
            
            # Embed & Store
            for chunk in chunks:
                if not chunk.strip():
                    continue
                # Generate embedding (returns numpy array, convert to list for pgvector)
                embedding = self.embedding_model.encode(chunk).tolist()
                
                db_filing = models.CorporateFiling(
                    stock_symbol=symbol,
                    filing_type=desc[:50], # Truncate if too long
                    filing_date=filing_date,
                    source_url=attachment_url,
                    chunk_text=chunk,
                    embedding_vector=embedding
                )
                self.db.add(db_filing)
            
            # Commit per document to ensure partial progress is saved
            self.db.commit()
            processed_count += 1
            logger.info(f"Successfully processed {symbol} filing. Stored {len(chunks)} chunks.")
            
        logger.info(f"NSE Scraper complete. Processed {processed_count} new filings.")
