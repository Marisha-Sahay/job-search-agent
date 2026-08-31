import requests
from datetime import datetime

def scrape_lever(company_name, board_token):
    """
    Lever uses a public JSON API.
    Example: https://api.lever.co/v0/postings/atlassian?mode=json
    """
    url = f"https://api.lever.co/v0/postings/{board_token}?mode=json"
    
    try:
        response = requests.get(url)
        
        if response.status_code != 200:
            print(f"Error fetching Lever board for {company_name}")
            return []
            
        data = response.json()
        jobs = []
        
        for job in data:
            title = job.get("text", "")
            location = job.get("categories", {}).get("location", "")
            
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
                "id": f"{company_name}-lever-{job.get('id')}",
                "title": title,
                "company": company_name,
                "url": job.get("hostedUrl"),
                "location": location,
                "date_found": datetime.now().isoformat(),
                "source": "Lever"
            })
            
        return jobs
    except Exception as e:
        print(f"Failed to scrape Lever for {company_name}: {e}")
        return []
