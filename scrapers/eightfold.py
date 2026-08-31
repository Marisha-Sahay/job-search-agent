from playwright.sync_api import sync_playwright
from datetime import datetime

def scrape_eightfold(company_name, domain):
    jobs = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # We will intercept the JSON response from the internal jobs API
        def handle_response(response):
            if "api/apply/v2/jobs" in response.url and response.status == 200:
                try:
                    data = response.json()
                    positions = data.get("positions", [])
                    for job in positions:
                        title = job.get("name", "")
                        location = job.get("location", "")
                        url = job.get("canonicalPositionUrl", "")
                        
                        title_lower = title.lower()
                        loc_lower = location.lower()
                        
                        if "austin" not in loc_lower and "tx" not in loc_lower and "texas" not in loc_lower:
                            continue
                            
                        is_senior = any(k in title_lower for k in ["senior", "snr", "staff", "lead", "principal", "10+"])
                        is_eng = any(k in title_lower for k in ["engineer", "developer", "architect", "programmer"])
                        if not (is_senior and is_eng):
                            continue
                            
                        jobs.append({
                            "id": f"{company_name}-eightfold-{job.get('id')}",
                            "title": title,
                            "company": company_name,
                            "url": url,
                            "location": location,
                            "date_found": datetime.now().isoformat(),
                            "source": "Eightfold"
                        })
                except Exception as e:
                    print(f"Error parsing Eightfold JSON: {e}")
                    
        page.on("response", handle_response)
        
        try:
            # Navigate to the career page which triggers the API call automatically
            page.goto(f"https://{company_name.lower()}.eightfold.ai/careers?domain={domain}", wait_until="networkidle", timeout=15000)
        except Exception as e:
            print(f"Timeout or error navigating Eightfold for {company_name}: {e}")
            
        browser.close()
        
    return jobs
