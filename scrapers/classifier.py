import re
from datetime import datetime, timezone

FINTECH_COMPANIES = {
    "circle", "paypal", "visa", "wise", "stripe", "plaid", "affirm",
    "block", "square", "robinhood", "coinbase", "brex", "ramp", "chime",
    "adyen", "sofi", "toast", "marqeta", "klarna", "bill.com", "jpmorganchase",
    "mastercard", "mercury", "carta"
}

def classify_sector(company_name: str, company_sector: str = None) -> str:
    """Classifies company sector as 'fintech' or 'general'."""
    if company_sector:
        return company_sector.lower()
    comp_clean = re.sub(r'[^a-zA-Z0-9]', '', company_name.lower())
    for ft in FINTECH_COMPANIES:
        if ft in comp_clean:
            return "fintech"
    return "general"

def classify_subsector(company_name: str, title: str) -> str:
    """Classifies fintech domain subsector."""
    c = company_name.lower()
    t = title.lower()
    
    # Risk & Fraud takes high precedence if in title
    if any(k in t for k in ["risk", "fraud", "aml", "kyc", "compliance", "sanctions"]):
        return "Risk & Compliance"
        
    # Crypto & Digital Assets
    if "coinbase" in c or any(k in t for k in ["crypto", "blockchain", "web3", "token", "defi", "wallet", "solana", "bitcoin", "ethereum"]):
        return "Crypto & Digital Assets"
        
    # Card Networks & Payment Rails
    if any(k in c for k in ["visa", "mastercard", "stripe", "plaid", "adyen", "wise"]) or any(k in t for k in ["payment", "processing", "settlement", "gateway", "checkout", "billing", "rails"]):
        return "Payments & Rails"
        
    # Spend & Neobanking
    if any(k in c for k in ["brex", "ramp", "mercury", "chime", "sofi"]) or any(k in t for k in ["corporate card", "spend management", "banking", "treasury", "ledger"]):
        return "Neobanking & Spend"
        
    # WealthTech & Trading
    if "robinhood" in c or any(k in t for k in ["trading", "brokerage", "invest", "portfolio", "wealth", "securities"]):
        return "Wealth & Trading"
        
    # Credit & Lending / BNPL
    if "affirm" in c or any(k in t for k in ["credit", "lending", "loan", "underwriting", "bnpl", "origination"]):
        return "Credit & Lending"
        
    return "Core FinTech"

def classify_level(title: str) -> str:
    """Classifies job level into standardized seniority tiers."""
    t = title.lower()
    if any(k in t for k in ["distinguished", "fellow", "vp", "vice president", "head of", "director", "managing director"]):
        return "Director / Exec"
    if any(k in t for k in ["principal", "architect"]):
        return "Principal"
    if any(k in t for k in ["staff", "lead", "team lead", "tech lead"]):
        return "Staff / Lead"
    if any(k in t for k in ["senior", "sr.", "sr ", "snr", "iii", "iv", "level 3", "level 4", "10+"]):
        return "Senior"
    if any(k in t for k in ["junior", "jr.", "entry", "associate", "intern", "new grad", "i", "level 1"]):
        return "Entry / Associate"
    return "Mid-Level"

def classify_function(title: str) -> str:
    """Classifies job role into functional departments."""
    t = title.lower()
    
    # Product Management
    if any(k in t for k in ["product manager", "product lead", "group product", "technical product", "product owner", "head of product", "vp product"]):
        return "Product Management"
    
    # Data & AI / ML
    if any(k in t for k in ["data scientist", "machine learning", "ai engineer", "data engineer", "analytics engineer", "ml engineer", "nlp", "llm", "deep learning"]):
        return "Data & AI"
        
    # Risk, Compliance, Fraud, AML, Legal
    if any(k in t for k in ["risk", "compliance", "fraud", "aml", "kyc", "sanctions", "regulatory", "trust & safety"]):
        return "Risk & Compliance"
        
    # DevOps, SRE, Infrastructure, Security, Cloud
    if any(k in t for k in ["devops", "sre", "site reliability", "infrastructure", "platform engineer", "security engineer", "cloud engineer", "systems engineer", "solutions designer", "solutions architect"]):
        return "DevOps & Infra"
        
    # Software Engineering (Backend, Frontend, Full Stack, Mobile, General)
    if any(k in t for k in ["software", "developer", "backend", "front-end", "frontend", "full stack", "fullstack", "mobile", "ios", "android", "engineer"]):
        return "Software Engineering"
        
    # Finance & Operations
    if any(k in t for k in ["finance", "accounting", "operations", "treasury", "settlement"]):
        return "Finance & Ops"
        
    return "Other"

def classify_workplace(location: str) -> str:
    """Classifies workplace type as Remote, Hybrid, or Onsite."""
    loc = (location or "").lower()
    if "remote" in loc:
        return "Remote"
    if "hybrid" in loc:
        return "Hybrid"
    return "Onsite / Office"

def is_austin_eligible(location: str) -> bool:
    """Checks if job is located in Austin or Austin-friendly Remote."""
    loc = (location or "").lower()
    return "austin" in loc or "tx" in loc or "texas" in loc or "remote" in loc

def extract_salary(text: str) -> str:
    """Attempts to extract salary range if present in text."""
    if not text:
        return ""
    # Matches patterns like $150k - $220k or $150,000 - $220,000
    match = re.search(r'(\$\d{2,3}(?:,\d{3})*(?:k)?\s*(?:-|to)\s*\$\d{2,3}(?:,\d{3})*(?:k)?)', text, re.IGNORECASE)
    return match.group(1) if match else ""

def classify_metro(location: str) -> str:
    """Classifies location string into primary FinTech metro regions."""
    loc = (location or "").lower()
    if "remote" in loc or "anywhere" in loc:
        return "Remote"
    if any(k in loc for k in ["san francisco", "sf", "bay area", "oakland", "sunnyvale", "san jose", "palo alto", "mountain view", "menlo park"]):
        return "SF Bay Area"
    if any(k in loc for k in ["new york", "nyc", "manhattan", "brooklyn"]):
        return "New York Metro"
    if "austin" in loc:
        return "Austin, TX"
    if any(k in loc for k in ["seattle", "bellevue", "redmond"]):
        return "Seattle, WA"
    if any(k in loc for k in ["london", "dublin", "berlin", "amsterdam", "paris", "uk", "ireland"]):
        return "Europe / UK"
def is_north_america(location: str) -> bool:
    """Checks if location is North America (US, Canada, US-Remote)."""
    loc = (location or "").lower()
    non_na = [
        "london", "uk", "united kingdom", "ireland", "dublin", "berlin", "germany",
        "paris", "france", "amsterdam", "netherlands", "madrid", "spain", "poland",
        "warsaw", "singapore", "india", "mumbai", "bangalore", "bengaluru", "australia",
        "sydney", "melbourne", "tokyo", "japan", "brazil", "sao paulo", "belgrade", "serbia",
        "mexico city", "sweden", "stockholm", "switzerland", "zurich"
    ]
    if any(k in loc for k in non_na):
        if "remote in the us" in loc or "us remote" in loc:
            return True
        return False
    return True

def enrich_job(job: dict, company_metadata: dict = None) -> dict:
    """Enriches a job dictionary with sector, subsector, level, function, workplace, metro, is_na, date_posted, and freshness tags."""
    company_name = job.get("company", "")
    title = job.get("title", "")
    location = job.get("location", "")
    date_found = job.get("date_found", "")
    date_posted = job.get("date_posted") or date_found
    
    company_sector = (company_metadata or {}).get("sector")
    sector = job.get("sector") or classify_sector(company_name, company_sector)
    
    enriched = dict(job)
    enriched["sector"] = sector
    enriched["subsector"] = job.get("subsector") or (classify_subsector(company_name, title) if sector == "fintech" else "General Tech")
    enriched["level"] = job.get("level") or classify_level(title)
    enriched["function"] = job.get("function") or classify_function(title)
    enriched["workplace"] = job.get("workplace") or classify_workplace(location)
    enriched["metro"] = job.get("metro") or classify_metro(location)
    enriched["is_austin"] = is_austin_eligible(location)
    enriched["is_na"] = is_north_america(location)
    enriched["salary"] = job.get("salary") or extract_salary(title)
    enriched["date_posted"] = date_posted
    
    # Check freshness (within last 48 hours)
    try:
        if date_found:
            dt = datetime.fromisoformat(date_found.replace("Z", "+00:00"))
            now = datetime.now(dt.tzinfo if dt.tzinfo else None)
            enriched["is_new"] = (now - dt).total_seconds() < (48 * 3600)
        else:
            enriched["is_new"] = True
    except Exception:
        enriched["is_new"] = False
        
    return enriched

