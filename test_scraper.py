import logging
import sys
from fmcsa_scraper_selenium import FMCSAScraperSelenium

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_scraper():
    """Test the scraper with a single MC number."""
    try:
        scraper = FMCSAScraperSelenium()
        result = scraper.extract_carrier_data("720604")
        logger.info(f"Result: {result}")
        return result
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return None

if __name__ == "__main__":
    result = test_scraper()
    sys.exit(0 if result else 1)