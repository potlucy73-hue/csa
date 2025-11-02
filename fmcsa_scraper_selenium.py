"""
FMCSA data scraper using Selenium web scraping.
"""

import os
import logging
import re
import time
from typing import Dict, Optional, Any
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.chrome.options import Options
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class FMCSAScraperSelenium:
    """FMCSA data extraction using Selenium."""
    
    def __init__(self, timeout: int = 30):
        """Initialize scraper with timeout."""
        self.timeout = timeout
        self.base_url = "https://safer.fmcsa.dot.gov/query.asp"
        self.driver = None
        
    def _setup_driver(self):
        """Set up Chrome driver with options."""
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.implicitly_wait(10)
        
    def _cleanup_driver(self):
        """Clean up the driver."""
        if self.driver:
            self.driver.quit()
            self.driver = None
            
    def extract_carrier_data(self, mc_number: str) -> Optional[Dict[str, Any]]:
        """Extract carrier data for a given MC number."""
        try:
            self._setup_driver()
            return self._extract_via_selenium(mc_number)
        finally:
            self._cleanup_driver()
            
    def _extract_via_selenium(self, mc_number: str) -> Optional[Dict[str, Any]]:
        """Extract data using Selenium."""
        try:
            # Go directly to the search results using query parameters
            search_url = f"https://safer.fmcsa.dot.gov/query.asp?searchtype=MC&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string={mc_number}"
            self.driver.get(search_url)
            
            time.sleep(3)  # Wait for any redirects or JavaScript
            
            # Check if we need to click the company link
            try:
                company_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, 'CompanySnapshot.aspx')]")
                if company_links:
                    company_links[0].click()
                    time.sleep(2)
            except Exception as e:
                logger.debug(f"No company link to click: {e}")
            
            # Look for tables that might contain our data
            tables = self.driver.find_elements(By.TAG_NAME, "table")
            if not tables:
                logger.error("No data tables found")
                return None
            
            # Parse data from the current page
            return self._parse_page(mc_number)
            
        except TimeoutException:
            logger.error(f"Timeout extracting MC {mc_number}")
            return None
        except Exception as e:
            logger.error(f"Error scraping MC {mc_number}: {e}")
            return None
            
    def _parse_page(self, mc_number: str) -> Dict[str, Any]:
        """Parse carrier data from the loaded page."""
        data = {
            "mc_number": mc_number,
            "dot_number": None,
            "company_name": None,
            "authority_status": None,
            "authority_type": None,
            "insurance_status": None,
            "insurance_expiry": None,
            "safety_rating": None,
            "violations_12mo": 0,
            "accidents_12mo": 0,
            "authority_date": None,
            "email": None,
            "phone": None,
            "state": None
        }
        
        try:
            # Save page source for debugging
            logger.debug(f"Page source: {self.driver.page_source[:200]}...")
            
            # Generic function to find a cell's value by its label
            def find_value_by_label(label_text: str, search_scope=None) -> Optional[str]:
                try:
                    scope = search_scope or self.driver
                    # Look for direct matches in table cells
                    elements = scope.find_elements(By.XPATH, f"//td[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{label_text.lower()}')]/following-sibling::td[1]")
                    if elements:
                        return elements[0].text.strip()
                    
                    # Look for matches in th elements
                    elements = scope.find_elements(By.XPATH, f"//th[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{label_text.lower()}')]/../td")
                    if elements:
                        return elements[0].text.strip()
                    
                    return None
                except Exception as e:
                    logger.debug(f"Error finding {label_text}: {e}")
                    return None
            
            # Try to find the main carrier information
            data["company_name"] = find_value_by_label("company name") or find_value_by_label("legal name")
            data["dot_number"] = find_value_by_label("dot number") or find_value_by_label("usdot")
            data["authority_type"] = find_value_by_label("entity type")
            data["authority_status"] = find_value_by_label("operating status")
            data["phone"] = find_value_by_label("phone")
            data["email"] = find_value_by_label("email")
            data["state"] = find_value_by_label("state") or find_value_by_label("principal place")
            data["safety_rating"] = find_value_by_label("rating") or find_value_by_label("safety rating")
            
            # Try to find insurance information in the current page
            data["insurance_status"] = find_value_by_label("insurance required")
            
            # Look for insurance expiry in various formats
            insurance_date = (find_value_by_label("insurance expiry") or 
                          find_value_by_label("policy expiration") or 
                          find_value_by_label("expiration date"))
            if insurance_date:
                data["insurance_expiry"] = insurance_date
            
            # Additional data cleanup
            data = {k: v.strip() if isinstance(v, str) else v for k, v in data.items()}
            data = {k: v if v not in ["", "None", "N/A"] else None for k, v in data.items()}
            
            # Verify we have at least some basic data
            if not data["company_name"] and not data["dot_number"]:
                logger.error(f"Could not find any carrier data for MC {mc_number}")
                return None
            
            return data
                
        except Exception as e:
            logger.error(f"Error parsing page for MC {mc_number}: {e}")
            logger.debug("Page source at error:", self.driver.page_source[:500])
            return None