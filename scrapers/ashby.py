import requests
from datetime import datetime

def scrape_ashby(company_name, board_token, is_fintech=True):
    """
    Scrapes jobs from Ashby's public job board API.
    Example: https://api.ashbyhq.com/posting-api/job-board/ramp
    """
    url = f"https://api.ashbyhq.com/posting-api/job-board/{board_token}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"Error fetching Ashby board for {company_name}: status {response.status_code}")
            return []
            
        data = response.json()
        jobs = []
        
        for job in data.get("jobs", []):
            title = job.get("title", "")
            location = job.get("location", "")
            job_url = job.get("jobUrl") or f"https://jobs.ashbyhq.com/{board_token}/{job.get('id')}"
            
            title_lower = title.lower()
            loc_lower = location.lower()
            
            if is_fintech:
                # Include relevant tech, product, data, risk, and corporate roles
                is_relevant = any(k in title_lower for k in [
                    "engineer", "developer", "architect", "product", "data", "ml", "ai",
                    "risk", "compliance", "fraud", "security", "infrastructure", "devops",
                    "analyst", "manager", "director", "lead", "designer", "finance"
                ])
                if not is_relevant:
                    continue
            else:
                # Austin Senior/Staff engineering filter
                if "austin" not in loc_lower and "tx" not in loc_lower and "texas" not in loc_lower:
                    continue
                is_senior = any(k in title_lower for k in ["senior", "snr", "staff", "lead", "principal", "10+"])
                is_eng = any(k in title_lower for k in ["engineer", "developer", "architect", "programmer"])
                if not (is_senior and is_eng):
                    continue
                    
            jobs.append({
                "id": f"{company_name}-ashby-{job.get('id')}",
                "title": title,
                "company": company_name,
                "url": job_url,
                "location": location or "Remote / Unspecified",
                "date_found": datetime.now().isoformat(),
                "date_posted": job.get("publishedAt") or datetime.now().isoformat(),
                "source": "Ashby",
                "sector": "fintech" if is_fintech else "tech"
            })
            
        return jobs
    except Exception as e:
        print(f"Failed to scrape Ashby for {company_name}: {e}")
        return []
