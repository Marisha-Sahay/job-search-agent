import json
import os
from datetime import datetime
from scrapers.greenhouse import scrape_greenhouse
from scrapers.builtinaustin import scrape_builtinaustin
from scrapers.workday import scrape_workday
from scrapers.lever import scrape_lever
from scrapers.eightfold import scrape_eightfold
from scrapers.ashby import scrape_ashby
from scrapers.classifier import enrich_job

def load_companies():
    with open("data/companies.json", "r") as f:
        return json.load(f)

def load_seen_jobs():
    if os.path.exists("data/jobs.json"):
        with open("data/jobs.json", "r") as f:
            return json.load(f)
    return []

def save_jobs(jobs):
    companies = {c["name"].lower(): c for c in load_companies()}
    enriched_jobs = [enrich_job(j, companies.get(j.get("company", "").lower())) for j in jobs]
    
    with open("data/jobs.json", "w") as f:
        json.dump(enriched_jobs, f, indent=2)
    
    # Mirror directly to web/jobs.json for GitHub Pages deployment
    os.makedirs("web", exist_ok=True)
    with open("web/jobs.json", "w") as f:
        json.dump(enriched_jobs, f, indent=2)

def main():
    print(f"[{datetime.now()}] Starting Job Search Agent & FinTech Radar...")
    companies = load_companies()
    seen_jobs = load_seen_jobs()
    
    # Map of seen jobs by URL for quick lookup
    jobs_by_url = {j['url']: j for j in seen_jobs}
    
    # Track companies scraped successfully in this run for active-job reconciliation
    successfully_scraped_companies = set()
    current_active_urls_by_company = {}

    for company in companies:
        name = company['name']
        ats = company.get('ats_type')
        sector = company.get('sector', 'tech')
        is_fintech = (sector == 'fintech')
        board_token = company.get('board_token', name.lower())
        
        print(f"Scraping {name} ({ats}, sector={sector})...")
        jobs = []
        scrape_success = False
        
        try:
            if ats == 'greenhouse':
                jobs = scrape_greenhouse(name, board_token, is_fintech=is_fintech)
                scrape_success = True
            elif ats == 'ashby':
                jobs = scrape_ashby(name, board_token, is_fintech=is_fintech)
                scrape_success = True
            elif ats == 'workday':
                api_url = company.get('api_url', f"https://{name.lower()}.wd5.myworkdayjobs.com/wday/cxs/{name.lower()}/jobs/jobs")
                jobs = scrape_workday(name, api_url, is_fintech=is_fintech, max_pages=3)
                scrape_success = True
            elif ats == 'eightfold':
                domain = company.get('domain', f"{name.lower()}.com")
                jobs = scrape_eightfold(name, domain)
                scrape_success = True
            elif ats == 'lever':
                jobs = scrape_lever(name, board_token)
                scrape_success = True
        except Exception as e:
            print(f"Error scraping {name}: {e}")
            scrape_success = False

        if scrape_success:
            successfully_scraped_companies.add(name)
            current_active_urls_by_company[name] = set()
            
            for j in jobs:
                url = j['url']
                current_active_urls_by_company[name].add(url)
                if url in jobs_by_url:
                    # Job exists, update last seen and reset miss count
                    jobs_by_url[url]['last_seen_date'] = datetime.now().isoformat()
                    jobs_by_url[url]['miss_count'] = 0
                else:
                    # Brand new job
                    j['last_seen_date'] = datetime.now().isoformat()
                    j['first_seen_date'] = datetime.now().isoformat()
                    j['miss_count'] = 0
                    jobs_by_url[url] = j

    # Also scrape Built In Austin (Aggregator for Austin tech market)
    print("Scraping Built In Austin (Aggregator)...")
    try:
        bia_jobs = scrape_builtinaustin()
        for j in bia_jobs:
            url = j['url']
            if url not in jobs_by_url:
                j['last_seen_date'] = datetime.now().isoformat()
                j['first_seen_date'] = datetime.now().isoformat()
                j['miss_count'] = 0
                jobs_by_url[url] = j
    except Exception as e:
        print(f"Note: Built In Austin scrape skipped or timed out: {e}")

    # Active Requisition Reconciliation: Prune stale / filled jobs
    # For companies that were successfully scraped, if an existing job was NOT seen, increment miss_count.
    # If missed 2 consecutive runs, remove it so dead links are eliminated.
    pruned_count = 0
    reconciled_jobs = []
    
    for url, job in jobs_by_url.items():
        comp_name = job.get('company')
        if comp_name in successfully_scraped_companies:
            active_urls = current_active_urls_by_company.get(comp_name, set())
            if url not in active_urls:
                miss_count = job.get('miss_count', 0) + 1
                job['miss_count'] = miss_count
                if miss_count >= 2:
                    pruned_count += 1
                    continue # Pruned from catalog
        reconciled_jobs.append(job)

    if pruned_count > 0:
        print(f"Reconciliation: Pruned {pruned_count} closed/inactive requisitions.")

    save_jobs(reconciled_jobs)
    print(f"[{datetime.now()}] Finished. Total active catalog size: {len(reconciled_jobs)} jobs.")

if __name__ == "__main__":
    main()
