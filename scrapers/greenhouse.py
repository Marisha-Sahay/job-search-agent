import requests
from datetime import datetime

def scrape_greenhouse(company_name, board_token, is_fintech=False):
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs"
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Error fetching Greenhouse board for {company_name}")
        return []
        
    data = response.json()
    jobs = []
    
    for job in data.get("jobs", []):
        location_name = job.get("location", {}).get("name", "")
        title = job.get("title", "")
        loc_lower = location_name.lower()
        title_lower = title.lower()
        
        if is_fintech:
            # For FinTech: include roles across US / Remote / Austin, and across key functions
            # Exclude obvious non-corporate roles if any
            is_relevant_role = any(k in title_lower for k in [
                "engineer", "developer", "architect", "product", "data", "ml", "ai",
                "risk", "compliance", "fraud", "security", "infrastructure", "devops",
                "analyst", "manager", "director", "lead", "designer"
            ])
            if not is_relevant_role:
                continue
        else:
            # Strict Location filter for Austin/TX for non-fintech
            if "austin" not in loc_lower and "tx" not in loc_lower and "texas" not in loc_lower:
                continue
                
            # Role filter: must be Senior/Staff/Lead/Principal AND Engineering
            is_senior = any(k in title_lower for k in ["senior", "snr", "staff", "lead", "principal", "10+"])
            is_eng = any(k in title_lower for k in ["engineer", "developer", "architect", "programmer"])
            if not (is_senior and is_eng):
                continue
            
        jobs.append({
            "id": f"{company_name}-gh-{job.get('id')}",
            "title": title,
            "company": company_name,
            "url": job.get("absolute_url"),
            "location": location_name or "Remote / Unspecified",
            "date_found": datetime.now().isoformat(),
            "date_posted": job.get("updated_at") or datetime.now().isoformat(),
            "source": "Greenhouse",
            "sector": "fintech" if is_fintech else "tech"
        })
        
    return jobs
