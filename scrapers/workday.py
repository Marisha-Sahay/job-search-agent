import requests
from datetime import datetime
import json

def scrape_workday(company_name, jobs_api_url):
    """
    Workday uses an internal JSON API for its job boards.
    jobs_api_url example: "https://paypal.wd5.myworkdayjobs.com/wday/cxs/paypal/jobs/jobs"
    """
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    payload = {
        "appliedFacets": {},
        "limit": 20,
        "offset": 0,
        "searchText": ""
    }
    
    try:
        response = requests.post(jobs_api_url, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f"Error fetching Workday board for {company_name}: {response.status_code}")
            return []
            
        data = response.json()
        jobs = []
        
        for job in data.get("jobPostings", []):
            title = job.get("title", "")
            location = job.get("locationsText", "")
            url = job.get("externalPath", "")
            
            # Filter
            title_lower = title.lower()
            loc_lower = location.lower()
            
            if "austin" not in loc_lower and "tx" not in loc_lower and "texas" not in loc_lower:
                continue
                
            is_senior = any(k in title_lower for k in ["senior", "snr", "staff", "lead", "principal", "10+"])
            is_eng = any(k in title_lower for k in ["engineer", "developer", "architect", "programmer"])
            if not (is_senior and is_eng):
                continue
                
            jobs.append({
                "id": f"{company_name}-wd-{job.get('bulletinId', url)}",
                "title": title,
                "company": company_name,
                "url": url,
                "location": location,
                "date_found": datetime.now().isoformat(),
                "source": "Workday"
            })
            
        return jobs
    except Exception as e:
        print(f"Failed to scrape Workday for {company_name}: {e}")
        return []
