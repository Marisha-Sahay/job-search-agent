import requests
from datetime import datetime
import re

def scrape_workday(company_name, jobs_api_url, is_fintech=True, max_pages=3):
    """
    Workday internal JSON API scraper with pagination and proper URL construction.
    Example:
      MasterCard: https://mastercard.wd1.myworkdayjobs.com/wday/cxs/mastercard/CorporateCareers/jobs
      Visa: https://visa.wd5.myworkdayjobs.com/wday/cxs/visa/Visa/jobs
    """
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # Extract base web URL from API URL
    # e.g., https://visa.wd5.myworkdayjobs.com/wday/cxs/visa/Visa/jobs -> https://visa.wd5.myworkdayjobs.com/en-US/Visa
    match = re.match(r"(https://[^/]+)/wday/cxs/[^/]+/([^/]+)/jobs", jobs_api_url)
    if match:
        base_web_url = f"{match.group(1)}/en-US/{match.group(2)}"
    else:
        base_web_url = jobs_api_url.split("/wday")[0]
        
    limit = 20
    offset = 0
    jobs = []
    
    for page in range(max_pages):
        payload = {
            "appliedFacets": {},
            "limit": limit,
            "offset": offset,
            "searchText": ""
        }
        
        try:
            response = requests.post(jobs_api_url, headers=headers, json=payload, timeout=15)
            if response.status_code != 200:
                print(f"Error fetching Workday board for {company_name} (offset {offset}): {response.status_code}")
                break
                
            data = response.json()
            postings = data.get("jobPostings", [])
            if not postings:
                break
                
            for job in postings:
                title = job.get("title", "")
                location = job.get("locationsText", "")
                ext_path = job.get("externalPath", "")
                remote_type = job.get("remoteType", "")
                
                title_lower = title.lower()
                loc_lower = location.lower()
                
                if is_fintech:
                    is_relevant = any(k in title_lower for k in [
                        "engineer", "developer", "architect", "product", "data", "ml", "ai",
                        "risk", "compliance", "fraud", "security", "infrastructure", "devops",
                        "analyst", "manager", "director", "lead", "designer", "finance", "solutions"
                    ])
                    if not is_relevant:
                        continue
                else:
                    # Strict Austin Senior Tech filter
                    if "austin" not in loc_lower and "tx" not in loc_lower and "texas" not in loc_lower:
                        continue
                    is_senior = any(k in title_lower for k in ["senior", "snr", "staff", "lead", "principal", "10+"])
                    is_eng = any(k in title_lower for k in ["engineer", "developer", "architect", "programmer"])
                    if not (is_senior and is_eng):
                        continue
                        
                # Construct clean job URL
                if ext_path.startswith("http"):
                    full_url = ext_path
                else:
                    full_url = f"{base_web_url}{ext_path}"
                    
                display_loc = location
                if remote_type and "remote" in remote_type.lower():
                    display_loc = f"{location} ({remote_type})" if location else remote_type
                    
                bulletin_id = re.search(r'_([A-Za-z0-9-]+)$', ext_path)
                job_id = bulletin_id.group(1) if bulletin_id else ext_path.replace("/", "-")
                
                jobs.append({
                    "id": f"{company_name}-wd-{job_id}",
                    "title": title,
                    "company": company_name,
                    "url": full_url,
                    "location": display_loc or "Unspecified",
                    "date_found": datetime.now().isoformat(),
                    "date_posted": job.get("postedOn") or datetime.now().isoformat(),
                    "source": "Workday",
                    "sector": "fintech" if is_fintech else "tech"
                })
                
            total = data.get("total", 0)
            offset += limit
            if offset >= total:
                break
                
        except Exception as e:
            print(f"Failed to scrape Workday for {company_name}: {e}")
            break
            
    return jobs
