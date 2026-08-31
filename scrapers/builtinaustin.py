from playwright.sync_api import sync_playwright
from datetime import datetime

def scrape_builtinaustin():
    jobs = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Intercept the JSON response from Built In's internal API
        def handle_response(response):
            if "api.builtin.com" in response.url and "jobs" in response.url and response.status == 200:
                try:
                    data = response.json()
                    # Built In often returns a list of jobs in an array or a 'data' field
                    items = data if isinstance(data, list) else data.get("data", [])
                    
                    for job in items:
                        # Depending on the exact structure, it could be nested
                        title = job.get("title", "")
                        company = job.get("company", {}).get("title", "")
                        alias = job.get("alias", "")
                        
                        if not title:
                            continue
                            
                        title_lower = title.lower()
                        is_senior = any(k in title_lower for k in ["senior", "snr", "staff", "lead", "principal", "10+"])
                        is_eng = any(k in title_lower for k in ["engineer", "developer", "architect", "programmer"])
                        if not (is_senior and is_eng):
                            continue
                            
                        url = f"https://www.builtinaustin.com{alias}" if alias.startswith("/") else f"https://www.builtinaustin.com/job/{job.get('id')}"
                            
                        jobs.append({
                            "id": f"builtinaustin-{job.get('id')}",
                            "title": title,
                            "company": company,
                            "url": url,
                            "location": "Austin / Hybrid",
                            "date_found": datetime.now().isoformat(),
                            "source": "Built In Austin"
                        })
                except Exception as e:
                    pass # Silently ignore non-JSON or unrelated API calls

        page.on("response", handle_response)
        
        try:
            url = "https://www.builtinaustin.com/jobs/dev-engineering/backend"
            page.goto(url, wait_until="networkidle", timeout=15000)
            
            # If the API interception failed (e.g., they render on server side for first load),
            # we can fallback to extracting from the DOM.
            if not jobs:
                elements = page.evaluate('''() => {
                    const results = [];
                    // Find generic job cards
                    const cards = document.querySelectorAll('div[data-id]');
                    cards.forEach(card => {
                        const titleEl = card.querySelector('a[href*="/job/"]');
                        if (titleEl) {
                            results.push({
                                title: titleEl.innerText,
                                url: titleEl.href,
                                company: card.innerText.split('\\n')[0] // Approximation
                            });
                        }
                    });
                    return results;
                }''')
                
                for el in elements:
                    title_lower = el['title'].lower()
                    is_senior = any(k in title_lower for k in ["senior", "snr", "staff", "lead", "principal", "10+"])
                    is_eng = any(k in title_lower for k in ["engineer", "developer", "architect", "programmer"])
                    if is_senior and is_eng:
                        jobs.append({
                            "id": f"builtinaustin-{el['url'].split('/')[-1]}",
                            "title": el['title'],
                            "company": el['company'],
                            "url": el['url'],
                            "location": "Austin",
                            "date_found": datetime.now().isoformat(),
                            "source": "Built In Austin"
                        })
                        
        except Exception as e:
            print(f"Timeout or error navigating BuiltInAustin: {e}")
            
        browser.close()
        
    # Deduplicate in case API and DOM both triggered
    seen = set()
    unique_jobs = []
    for j in jobs:
        if j['url'] not in seen:
            seen.add(j['url'])
            unique_jobs.append(j)
            
    return unique_jobs
