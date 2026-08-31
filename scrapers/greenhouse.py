import requests
from datetime import datetime

def scrape_greenhouse(company_name, board_token):
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs"
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Error fetching Greenhouse board for {company_name}")
        return []
        
    data = response.json()
    jobs = []
    
    for job in data.get("jobs", []):
        location_name = job.get("location", {}).get("name", "").lower()
        title = job.get("title", "").lower()
        
        # Strict Location filter for Austin/TX
        if "austin" not in location_name and "tx" not in location_name and "texas" not in location_name:
            continue
            
        # Role filter: must be Senior/Staff/Lead/Principal AND Engineering
        is_senior = any(k in title for k in ["senior", "snr", "staff", "lead", "principal", "10+"])
        is_eng = any(k in title for k in ["engineer", "developer", "architect", "programmer"])
        if not (is_senior and is_eng):
            continue
            
        jobs.append({
            "id": f"{company_name}-gh-{job.get('id')}",
            "title": job.get("title"),
            "company": company_name,
            "url": job.get("absolute_url"),
            "location": job.get("location", {}).get("name"),
            "date_found": datetime.now().isoformat(),
            "source": "Greenhouse"
        })
        
    return jobs
