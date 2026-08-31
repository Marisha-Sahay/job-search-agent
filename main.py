import json
import os
from datetime import datetime
from scrapers.greenhouse import scrape_greenhouse
from scrapers.builtinaustin import scrape_builtinaustin
from scrapers.workday import scrape_workday
from scrapers.lever import scrape_lever
from scrapers.eightfold import scrape_eightfold

# Define the keywords for filtering
KEYWORDS = ["backend", "full stack", "ai", "senior", "staff", "10+"]
LOCATIONS = ["austin", "remote"]

def load_companies():
    with open("data/companies.json", "r") as f:
        return json.load(f)

def load_seen_jobs():
    if os.path.exists("data/jobs.json"):
        with open("data/jobs.json", "r") as f:
            return json.load(f)
    return []

def save_jobs(jobs):
    with open("data/jobs.json", "w") as f:
        json.dump(jobs, f, indent=2)

def main():
    print(f"[{datetime.now()}] Starting job search agent...")
    companies = load_companies()
    seen_jobs = load_seen_jobs()
    seen_urls = {job['url'] for job in seen_jobs}
    
    new_jobs_found = []
    
    for company in companies:
        print(f"Scraping {company['name']}...")
        if company['ats_type'] == 'greenhouse':
            # We assume the careers URL ends with the board token or we can derive it
            # For this MVP, we will derive token from the URL or name
            # Example: https://www.cloudflare.com/careers/jobs/ -> cloudflare
            # Since cloudflare and circle are the greenhouse ones:
            board_token = company['name'].lower()
            if company['name'] == 'Circle': board_token = 'circleci' # common edge case
            jobs = scrape_greenhouse(company['name'], board_token)
            new_jobs_found.extend([j for j in jobs if j['url'] not in seen_urls])
            
        elif company['ats_type'] == 'workday':
            # Example Workday careers URL in companies.json: https://paypal.wd5.myworkdayjobs.com/jobs
            # We need to construct the API URL: https://paypal.wd5.myworkdayjobs.com/wday/cxs/paypal/jobs/jobs
            api_url = "https://paypal.wd5.myworkdayjobs.com/wday/cxs/paypal/jobs/jobs"
            jobs = scrape_workday(company['name'], api_url)
            new_jobs_found.extend([j for j in jobs if j['url'] not in seen_urls])
            
        elif company['ats_type'] == 'eightfold':
            # PayPal uses Eightfold AI
            domain = "paypal.com"
            jobs = scrape_eightfold(company['name'], domain)
            new_jobs_found.extend([j for j in jobs if j['url'] not in seen_urls])
            
        elif company['ats_type'] == 'lever':
            # Example token is usually the company name lowercase
            board_token = company['name'].lower()
            jobs = scrape_lever(company['name'], board_token)
            new_jobs_found.extend([j for j in jobs if j['url'] not in seen_urls])

    # Also scrape Built In Austin
    print("Scraping Built In Austin (Aggregator)...")
    bia_jobs = scrape_builtinaustin()
    new_jobs_found.extend([j for j in bia_jobs if j['url'] not in seen_urls])
        
    if new_jobs_found:
        print(f"Found {len(new_jobs_found)} new jobs matching criteria.")
        seen_jobs.extend(new_jobs_found)
        save_jobs(seen_jobs)
    else:
        print("No new jobs found.")
        
    print(f"[{datetime.now()}] Finished.")

if __name__ == "__main__":
    main()
