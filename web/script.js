document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('jobs-container');

    fetch('jobs.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(jobs => {
            container.innerHTML = ''; // Clear loading text
            
            if (jobs.length === 0) {
                container.innerHTML = '<p class="loading">No jobs found yet.</p>';
                return;
            }

            // Sort jobs by date descending (newest first)
            // Assuming jobs have a 'date_found' field like '2023-10-27T10:00:00Z'
            jobs.sort((a, b) => new Date(b.date_found) - new Date(a.date_found));

            jobs.forEach(job => {
                const card = document.createElement('div');
                card.className = 'job-card';
                
                const title = document.createElement('a');
                title.className = 'job-title';
                title.href = job.url;
                title.target = '_blank';
                title.textContent = job.title;
                
                const company = document.createElement('div');
                company.className = 'company';
                company.textContent = job.company;
                
                const details = document.createElement('div');
                details.className = 'details';
                
                const locTag = document.createElement('span');
                locTag.className = 'tag';
                locTag.textContent = job.location || 'Location Unspecified';
                details.appendChild(locTag);

                const dateTag = document.createElement('span');
                dateTag.className = 'tag';
                const dateObj = new Date(job.date_found);
                dateTag.textContent = isNaN(dateObj) ? 'Recent' : dateObj.toLocaleDateString();
                details.appendChild(dateTag);

                card.appendChild(title);
                card.appendChild(company);
                card.appendChild(details);
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error fetching jobs:', error);
            container.innerHTML = '<p class="loading" style="color: red;">Error loading jobs. The scrape might not have run yet.</p>';
        });
});
