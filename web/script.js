/**
 * FinTech & Payments Talent Radar
 * Client-Side Controller, Search, Metro Filtering & Preset Manager
 */

document.addEventListener('DOMContentLoaded', () => {
    const pageMode = document.body.dataset.page || 'fintech'; // 'fintech' or 'austin'
    
    // UI Elements
    const jobsContainer = document.getElementById('jobs-container');
    const resultsCountEl = document.getElementById('results-count');
    const searchInput = document.getElementById('search-input');
    const companySelect = document.getElementById('company-select');
    const sortSelect = document.getElementById('sort-select');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const saveViewBtn = document.getElementById('save-view-btn');
    const savedViewsSelect = document.getElementById('saved-views-select');
    const navCountBadge = document.getElementById('nav-count-badge');
    
    // Personal Tracker Storage (for Austin page)
    const STORAGE_KEY = 'job_tracker_state_v1';
    let trackerState = {};
    try {
        trackerState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
        trackerState = {};
    }

    function saveTrackerState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trackerState));
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }
    }

    // Saved Views / Presets Storage (for FinTech page)
    const SAVED_VIEWS_KEY = 'fintech_saved_views_v1';
    let savedViews = [];
    try {
        savedViews = JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || '[]');
    } catch (e) {
        savedViews = [];
    }

    function persistSavedViews() {
        try {
            localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
        } catch (e) {
            console.error('Failed to save views to localStorage', e);
        }
    }

    const defaultMetro = pageMode === 'fintech' ? 'na' : 'all';

    // Active Filter State
    const filters = {
        function: 'all',
        level: 'all',
        metro: defaultMetro,
        workplace: 'all',
        sector: 'all',
        company: 'all',
        shortcut: 'all',
        trackerTab: 'all',
        search: '',
        sort: 'newest'
    };

    let allRawJobs = [];

    // Fallback Classification Helpers
    function classifySector(job) {
        if (job.sector) return job.sector.toLowerCase();
        const fintechNames = [
            'circle', 'paypal', 'visa', 'mastercard', 'wise', 'stripe', 'plaid', 
            'affirm', 'brex', 'robinhood', 'coinbase', 'ramp', 'mercury'
        ];
        const name = (job.company || '').toLowerCase();
        return fintechNames.some(fn => name.includes(fn)) ? 'fintech' : 'tech';
    }

    function classifyMetro(location) {
        const loc = (location || '').toLowerCase();
        if (loc.includes('remote') || loc.includes('anywhere')) return 'Remote';
        if (loc.match(/san francisco|sf|bay area|oakland|sunnyvale|san jose|palo alto|mountain view|menlo park/)) return 'SF Bay Area';
        if (loc.match(/new york|nyc|manhattan|brooklyn/)) return 'New York Metro';
        if (loc.includes('austin')) return 'Austin, TX';
        if (loc.match(/seattle|bellevue|redmond/)) return 'Seattle, WA';
        if (loc.match(/london|dublin|berlin|amsterdam|paris|uk|ireland/)) return 'Europe / UK';
        return 'Other Locations';
    }

    function classifyLevel(title) {
        const t = (title || '').toLowerCase();
        if (t.match(/distinguished|fellow|director|vp|head of|managing director/)) return 'Director / Exec';
        if (t.match(/principal|architect/)) return 'Principal';
        if (t.match(/staff|lead|team lead|tech lead/)) return 'Staff / Lead';
        if (t.match(/senior|sr\.|sr |snr|iii|iv|10\+/)) return 'Senior';
        if (t.match(/junior|jr\.|entry|associate|intern|new grad/)) return 'Entry / Associate';
        return 'Mid-Level';
    }

    function classifyFunction(title) {
        const t = (title || '').toLowerCase();
        if (t.match(/product manager|product lead|group product|technical product|product owner/)) return 'Product Management';
        if (t.match(/data scientist|machine learning|ai engineer|data engineer|analytics engineer|ml engineer|nlp|llm/)) return 'Data & AI';
        if (t.match(/risk|compliance|fraud|aml|kyc|sanctions|regulatory|trust & safety/)) return 'Risk & Compliance';
        if (t.match(/devops|sre|site reliability|infrastructure|platform engineer|security engineer|cloud engineer|systems engineer|solutions/)) return 'DevOps & Infra';
        if (t.match(/software|developer|backend|front-end|frontend|full stack|fullstack|mobile|ios|android|engineer/)) return 'Software Engineering';
        if (t.match(/finance|accounting|operations|treasury|settlement/)) return 'Finance & Ops';
        return 'Other';
    }

    function classifyWorkplace(location) {
        const loc = (location || '').toLowerCase();
        if (loc.includes('remote')) return 'Remote';
        if (loc.includes('hybrid')) return 'Hybrid';
        return 'Onsite / Office';
    }

    function isAustinEligible(location) {
        const loc = (location || '').toLowerCase();
        return loc.includes('austin') || loc.includes('tx') || loc.includes('texas') || loc.includes('remote');
    }

    function isNorthAmericaLocation(location) {
        const loc = (location || '').toLowerCase();
        const nonNa = [
            'london', 'uk', 'united kingdom', 'ireland', 'dublin', 'berlin', 'germany',
            'paris', 'france', 'amsterdam', 'netherlands', 'madrid', 'spain', 'poland',
            'warsaw', 'singapore', 'india', 'mumbai', 'bangalore', 'bengaluru', 'australia',
            'sydney', 'melbourne', 'tokyo', 'japan', 'brazil', 'sao paulo', 'belgrade', 'serbia',
            'mexico city', 'sweden', 'stockholm', 'switzerland', 'zurich'
        ];
        if (nonNa.some(k => loc.includes(k))) {
            if (loc.includes('remote in the us') || loc.includes('us remote')) return true;
            return false;
        }
        return true;
    }

    function getCompanyLogoClass(company) {
        const c = (company || '').toLowerCase();
        if (c.includes('visa')) return 'logo-visa';
        if (c.includes('mastercard')) return 'logo-mastercard';
        if (c.includes('stripe')) return 'logo-stripe';
        if (c.includes('coinbase')) return 'logo-coinbase';
        if (c.includes('ramp')) return 'logo-ramp';
        if (c.includes('plaid')) return 'logo-plaid';
        if (c.includes('robinhood')) return 'logo-robinhood';
        if (c.includes('brex')) return 'logo-brex';
        if (c.includes('affirm')) return 'logo-affirm';
        if (c.includes('cloudflare')) return 'logo-cloudflare';
        return 'logo-default';
    }

    function getSubsectorBadgeClass(subsector) {
        switch (subsector) {
            case 'Payments & Rails': return 'tag-subsector-payments';
            case 'Crypto & Digital Assets': return 'tag-subsector-crypto';
            case 'Neobanking & Spend': return 'tag-subsector-neobank';
            case 'Risk & Compliance': return 'tag-subsector-risk';
            case 'Wealth & Trading': return 'tag-subsector-trading';
            case 'Credit & Lending': return 'tag-subsector-credit';
            default: return 'tag-subsector-payments';
        }
    }

    function formatJobDate(dateRaw) {
        if (!dateRaw) return 'Recent Requisition';
        if (typeof dateRaw === 'string' && dateRaw.toLowerCase().startsWith('posted')) {
            return dateRaw;
        }
        const d = new Date(dateRaw);
        if (isNaN(d.getTime())) return dateRaw;
        
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return 'Opened Today';
        if (diffDays === 1) return 'Opened Yesterday';
        if (diffDays < 7) return `Opened ${diffDays}d ago`;
        if (diffDays < 30) return `Opened ${Math.floor(diffDays / 7)}w ago`;
        return `Opened ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }

    function normalizeJob(raw) {
        return {
            id: raw.id || `${raw.company}-${raw.title}`.replace(/\s+/g, '-'),
            title: raw.title || 'Untitled Role',
            company: raw.company || 'Unknown Company',
            url: raw.url || '#',
            location: raw.location || 'Remote / Unspecified',
            date_found: raw.date_found || new Date().toISOString(),
            date_posted: raw.date_posted || raw.date_found || new Date().toISOString(),
            source: raw.source || 'Direct',
            sector: raw.sector || classifySector(raw),
            subsector: raw.subsector || 'Payments & Rails',
            level: raw.level || classifyLevel(raw.title),
            function: raw.function || classifyFunction(raw.title),
            workplace: raw.workplace || classifyWorkplace(raw.location),
            metro: raw.metro || classifyMetro(raw.location),
            is_austin: raw.is_austin !== undefined ? raw.is_austin : isAustinEligible(raw.location),
            is_na: raw.is_na !== undefined ? raw.is_na : isNorthAmericaLocation(raw.location),
            is_new: raw.is_new !== undefined ? raw.is_new : false,
            salary: raw.salary || ''
        };
    }

    // URL Query State Synchronization
    function readUrlFilters() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('function')) filters.function = params.get('function');
        if (params.has('level')) filters.level = params.get('level');
        if (params.has('metro')) {
            filters.metro = params.get('metro');
        } else {
            filters.metro = defaultMetro;
        }
        if (params.has('workplace')) filters.workplace = params.get('workplace');
        if (params.has('company')) filters.company = params.get('company');
        if (params.has('sector')) filters.sector = params.get('sector');
        if (params.has('search')) filters.search = params.get('search');
        if (params.has('sort')) filters.sort = params.get('sort');

        syncUIControls();
    }

    function syncUIControls() {
        if (searchInput) searchInput.value = filters.search || '';
        if (companySelect && filters.company) companySelect.value = filters.company;
        if (sortSelect && filters.sort) sortSelect.value = filters.sort;

        const filterFuncEl = document.getElementById('filter-function');
        const filterLevelEl = document.getElementById('filter-level');
        const filterMetroEl = document.getElementById('filter-metro');
        const clearBtn = document.getElementById('clear-filters-btn');

        if (filterFuncEl) {
            filterFuncEl.value = filters.function || 'all';
            filterFuncEl.classList.toggle('active', filters.function !== 'all');
        }
        if (filterLevelEl) {
            filterLevelEl.value = filters.level || 'all';
            filterLevelEl.classList.toggle('active', filters.level !== 'all');
        }
        if (filterMetroEl) {
            filterMetroEl.value = filters.metro || defaultMetro;
            filterMetroEl.classList.toggle('active', filters.metro !== defaultMetro);
        }
        if (companySelect) {
            companySelect.classList.toggle('active', filters.company !== 'all');
        }

        // Quick chip active state
        document.querySelectorAll('.quick-chip-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shortcut === filters.shortcut);
        });

        // Show/hide Clear button
        const hasActiveFilters = filters.function !== 'all' || 
                                 filters.level !== 'all' || 
                                 filters.metro !== defaultMetro || 
                                 filters.company !== 'all' || 
                                 Boolean(filters.search) || 
                                 (filters.shortcut !== 'all' && filters.shortcut !== '');
        if (clearBtn) {
            clearBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';
        }
    }

    function updateUrlState() {
        const params = new URLSearchParams();
        if (filters.function !== 'all') params.set('function', filters.function);
        if (filters.level !== 'all') params.set('level', filters.level);
        if (filters.metro !== defaultMetro) params.set('metro', filters.metro);
        if (filters.workplace !== 'all') params.set('workplace', filters.workplace);
        if (filters.company !== 'all') params.set('company', filters.company);
        if (filters.sector !== 'all') params.set('sector', filters.sector);
        if (filters.search) params.set('search', filters.search);
        if (filters.sort !== 'newest') params.set('sort', filters.sort);

        const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState(null, '', newRelativePathQuery);
        syncUIControls();
    }

    // Share & Bookmark View Actions
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            updateUrlState();
            navigator.clipboard.writeText(window.location.href).then(() => {
                const originalHtml = copyLinkBtn.innerHTML;
                copyLinkBtn.classList.add('copied');
                copyLinkBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>Link Copied! (⌘+D to Bookmark)</span>
                `;
                setTimeout(() => {
                    copyLinkBtn.classList.remove('copied');
                    copyLinkBtn.innerHTML = originalHtml;
                }, 2800);
            }).catch(err => {
                console.error('Clipboard copy failed:', err);
            });
        });
    }

    // Preset Saved Views Manager
    function populateSavedViewsDropdown() {
        if (!savedViewsSelect) return;
        savedViewsSelect.innerHTML = '<option value="">📁 Saved Searches</option>';
        savedViews.forEach((sv, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `⭐ ${sv.name}`;
            savedViewsSelect.appendChild(opt);
        });
    }

    if (saveViewBtn) {
        saveViewBtn.addEventListener('click', () => {
            updateUrlState();
            const defaultName = [
                filters.level !== 'all' ? filters.level : '',
                filters.function !== 'all' ? filters.function : '',
                filters.metro !== 'all' ? filters.metro : '',
                filters.search ? `"${filters.search}"` : ''
            ].filter(Boolean).join(' • ') || 'Custom Search';

            const viewName = prompt('Enter a name for this search preset:', defaultName);
            if (viewName) {
                savedViews.push({
                    name: viewName.trim(),
                    filters: { ...filters },
                    url: window.location.href
                });
                persistSavedViews();
                populateSavedViewsDropdown();
                
                const orig = saveViewBtn.innerHTML;
                saveViewBtn.classList.add('copied');
                saveViewBtn.innerHTML = '<span>Saved!</span>';
                setTimeout(() => {
                    saveViewBtn.classList.remove('copied');
                    saveViewBtn.innerHTML = orig;
                }, 1800);
            }
        });
    }

    if (savedViewsSelect) {
        savedViewsSelect.addEventListener('change', (e) => {
            const idx = e.target.value;
            if (idx === '') return;
            const targetView = savedViews[idx];
            if (targetView && targetView.filters) {
                Object.assign(filters, targetView.filters);
                
                // Update UI state
                if (searchInput) searchInput.value = filters.search || '';
                if (companySelect) companySelect.value = filters.company || 'all';
                if (sortSelect) sortSelect.value = filters.sort || 'newest';
                
                document.querySelectorAll('.pill-btn').forEach(btn => {
                    const key = btn.dataset.filterKey;
                    const val = btn.dataset.filterVal;
                    if (key && val) {
                        btn.classList.toggle('active', filters[key] === val);
                    }
                });

                document.querySelectorAll('.shortcut-chip').forEach(c => c.classList.remove('active'));
                updateUrlState();
                renderJobs();
            }
        });
    }

    function populateCompanyDropdown(jobs) {
        if (!companySelect) return;
        const companies = Array.from(new Set(jobs.map(j => j.company))).sort();
        const currentVal = companySelect.value;
        companySelect.innerHTML = '<option value="all">All Companies</option>';
        companies.forEach(comp => {
            const opt = document.createElement('option');
            opt.value = comp;
            opt.textContent = comp;
            companySelect.appendChild(opt);
        });
        if (companies.includes(currentVal)) {
            companySelect.value = currentVal;
        }
    }

    function getLevelBadgeClass(level) {
        switch (level) {
            case 'Staff / Lead': return 'tag-level-staff';
            case 'Principal':
            case 'Director / Exec': return 'tag-level-principal';
            case 'Senior': return 'tag-level-senior';
            case 'Mid-Level': return 'tag-level-mid';
            default: return 'tag-level-other';
        }
    }

    function renderJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.id = `job-${job.id}`;

        const isSaved = trackerState[job.id]?.saved || false;
        const isApplied = trackerState[job.id]?.applied || false;
        const appliedDate = trackerState[job.id]?.appliedDate || '';

        const initials = job.company.substring(0, 2).toUpperCase();
        const openedFormatted = formatJobDate(job.date_posted);

        const isAustin = job.is_austin && job.location.toLowerCase().includes('austin');
        const workplaceClass = job.workplace === 'Remote' ? 'tag-workplace-remote' : (isAustin ? 'tag-workplace-austin' : 'tag-function');
        const logoClass = getCompanyLogoClass(job.company);

        card.innerHTML = `
            <div class="job-card-top">
                <div class="job-main-info">
                    <div class="company-logo ${logoClass}">${initials}</div>
                    <div class="job-heading-group">
                        <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="job-title-link">
                            ${job.title}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                        <div class="job-meta-row">
                            <span class="company-name">${job.company}</span>
                            <span class="location-text">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                ${job.location}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    ${pageMode === 'austin' ? `
                        <button class="btn-icon-tracker ${isSaved ? 'saved' : ''}" title="${isSaved ? 'Remove from Saved' : 'Save / Bookmark Role'}" data-action="save" data-id="${job.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </button>
                        <button class="btn-apply-status ${isApplied ? 'applied' : ''}" data-action="apply" data-id="${job.id}">
                            ${isApplied ? `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Applied ${appliedDate ? '(' + appliedDate + ')' : ''}
                            ` : `
                                <span>Mark Applied</span>
                            `}
                        </button>
                    ` : ''}
                    <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="btn-apply">
                        Apply
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </a>
                </div>
            </div>
            <div class="job-tags-row">
                ${job.is_new ? '<span class="badge-new">NEW</span>' : ''}
                <span class="tag-badge ${getLevelBadgeClass(job.level)}">${job.level}</span>
                <span class="tag-badge tag-function">${job.function}</span>
                <span class="tag-badge ${workplaceClass}">${job.workplace}</span>
                ${job.metro && job.metro !== 'Other Locations' ? `<span class="tag-badge" style="background: rgba(43, 108, 176, 0.08); color: #2b6cb0; border: 1px solid rgba(43, 108, 176, 0.22);">${job.metro}</span>` : ''}
                ${job.sector === 'fintech' && job.subsector ? `<span class="tag-badge ${getSubsectorBadgeClass(job.subsector)}">${job.subsector}</span>` : ''}
                ${job.salary ? `<span class="tag-badge" style="background: rgba(45, 106, 79, 0.1); color: #20503b; border: 1px solid rgba(45, 106, 79, 0.25); font-weight: 700;">${job.salary}</span>` : ''}
                <span class="tag-date">${openedFormatted}</span>
            </div>
        `;

        if (pageMode === 'austin') {
            const saveBtn = card.querySelector('[data-action="save"]');
            const applyBtn = card.querySelector('[data-action="apply"]');

            if (saveBtn) {
                saveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!trackerState[job.id]) trackerState[job.id] = {};
                    trackerState[job.id].saved = !trackerState[job.id].saved;
                    saveTrackerState();
                    renderJobs();
                    updateTrackerCounters();
                });
            }

            if (applyBtn) {
                applyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!trackerState[job.id]) trackerState[job.id] = {};
                    const nowApplied = !trackerState[job.id].applied;
                    trackerState[job.id].applied = nowApplied;
                    trackerState[job.id].appliedDate = nowApplied ? new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
                    saveTrackerState();
                    renderJobs();
                    updateTrackerCounters();
                });
            }
        }

        return card;
    }

    function updateTrackerCounters() {
        if (pageMode !== 'austin') return;
        const allAustinJobs = allRawJobs.filter(isJobAustinSeniorTech);
        const savedCount = allAustinJobs.filter(j => trackerState[j.id]?.saved).length;
        const appliedCount = allAustinJobs.filter(j => trackerState[j.id]?.applied).length;

        const countSavedEl = document.getElementById('count-saved');
        const countAppliedEl = document.getElementById('count-applied');
        const countAllEl = document.getElementById('count-all');

        if (countSavedEl) countSavedEl.textContent = savedCount;
        if (countAppliedEl) countAppliedEl.textContent = appliedCount;
        if (countAllEl) countAllEl.textContent = allAustinJobs.length;
    }

    function isJobFintech(job) {
        return job.sector === 'fintech';
    }

    function isJobAustinSeniorTech(job) {
        const isSeniorPlus = ['Senior', 'Staff / Lead', 'Principal', 'Director / Exec'].includes(job.level);
        const isTechFunction = ['Software Engineering', 'DevOps & Infra', 'Data & AI'].includes(job.function);
        return job.is_austin && isSeniorPlus && isTechFunction;
    }

    function renderJobs() {
        jobsContainer.innerHTML = '';

        let dataset = [];
        if (pageMode === 'fintech') {
            dataset = allRawJobs.filter(isJobFintech);
        } else {
            dataset = allRawJobs.filter(isJobAustinSeniorTech);
            if (filters.trackerTab === 'saved') {
                dataset = dataset.filter(j => trackerState[j.id]?.saved);
            } else if (filters.trackerTab === 'applied') {
                dataset = dataset.filter(j => trackerState[j.id]?.applied);
            }
        }

        // Quick View Shortcuts
        if (filters.shortcut === 'staff') {
            dataset = dataset.filter(j => ['Staff / Lead', 'Principal', 'Director / Exec'].includes(j.level));
        } else if (filters.shortcut === 'rails') {
            dataset = dataset.filter(j => ['Visa', 'MasterCard', 'Stripe', 'Plaid'].includes(j.company) || j.subsector === 'Payments & Rails');
        } else if (filters.shortcut === 'risk') {
            dataset = dataset.filter(j => j.function === 'Risk & Compliance' || j.subsector === 'Risk & Compliance');
        } else if (filters.shortcut === 'remote-pm') {
            dataset = dataset.filter(j => j.function === 'Product Management' && j.workplace === 'Remote');
        } else if (filters.shortcut === 'crypto') {
            dataset = dataset.filter(j => j.company === 'Coinbase' || j.subsector === 'Crypto & Digital Assets');
        }

        // Faceted Filters
        if (filters.function !== 'all') {
            dataset = dataset.filter(j => j.function.toLowerCase() === filters.function.toLowerCase());
        }

        if (filters.level !== 'all') {
            dataset = dataset.filter(j => j.level.toLowerCase() === filters.level.toLowerCase());
        }

        // Location / Regional Scope Filter
        if (filters.metro === 'na') {
            dataset = dataset.filter(j => j.is_na === true);
        } else if (filters.metro === 'all') {
            // Worldwide / show all
        } else if (filters.metro === 'international') {
            dataset = dataset.filter(j => j.is_na === false);
        } else if (filters.metro === 'Europe / UK') {
            dataset = dataset.filter(j => j.metro === 'Europe / UK' || ['london', 'dublin', 'uk', 'ireland', 'berlin', 'amsterdam', 'paris', 'germany', 'france', 'spain', 'poland'].some(k => (j.location || '').toLowerCase().includes(k)));
        } else if (filters.metro === 'Remote') {
            dataset = dataset.filter(j => j.workplace === 'Remote' || j.metro === 'Remote');
        } else if (filters.metro !== 'all') {
            dataset = dataset.filter(j => (j.metro || '').toLowerCase() === filters.metro.toLowerCase());
        }

        if (filters.workplace !== 'all') {
            if (filters.workplace.toLowerCase() === 'remote') {
                dataset = dataset.filter(j => j.workplace === 'Remote');
            } else if (filters.workplace.toLowerCase() === 'hybrid/onsite') {
                dataset = dataset.filter(j => j.workplace !== 'Remote');
            }
        }

        if (filters.sector !== 'all') {
            dataset = dataset.filter(j => j.sector.toLowerCase() === filters.sector.toLowerCase());
        }

        if (filters.company !== 'all') {
            dataset = dataset.filter(j => j.company === filters.company);
        }

        if (filters.search) {
            const query = filters.search.toLowerCase().trim();
            dataset = dataset.filter(j => 
                j.title.toLowerCase().includes(query) ||
                j.company.toLowerCase().includes(query) ||
                j.location.toLowerCase().includes(query) ||
                j.function.toLowerCase().includes(query) ||
                (j.subsector && j.subsector.toLowerCase().includes(query))
            );
        }

        // Sorting
        if (filters.sort === 'newest') {
            dataset.sort((a, b) => new Date(b.date_posted || b.date_found) - new Date(a.date_posted || a.date_found));
        } else if (filters.sort === 'company') {
            dataset.sort((a, b) => a.company.localeCompare(b.company));
        } else if (filters.sort === 'title') {
            dataset.sort((a, b) => a.title.localeCompare(b.title));
        }

        if (resultsCountEl) {
            let locLabel = '';
            if (filters.metro === 'na') locLabel = ' in North America';
            else if (filters.metro === 'Remote') locLabel = ' (Remote)';
            else if (filters.metro === 'Europe / UK') locLabel = ' in Europe & UK';
            else if (filters.metro === 'international') locLabel = ' (Global / Non-NA)';
            else if (filters.metro === 'all') locLabel = ' Worldwide';
            else if (filters.metro !== 'all') locLabel = ` in ${filters.metro}`;

            resultsCountEl.innerHTML = `Showing <strong>${dataset.length.toLocaleString()}</strong> ${pageMode === 'fintech' ? 'FinTech jobs' : 'Austin Senior Tech jobs'}${locLabel}`;
        }

        if (dataset.length === 0) {
            jobsContainer.innerHTML = `
                <div class="state-message">
                    <div class="state-icon">🔍</div>
                    <div class="state-title">No matching roles found</div>
                    <p class="state-desc">Try clearing some filters or selecting "Show All".</p>
                </div>
            `;
            return;
        }

        dataset.forEach(job => {
            jobsContainer.appendChild(renderJobCard(job));
        });
    }

    function setupEventListeners() {
        // Linear-Style Command Toolbar Filter Dropdowns
        ['filter-function', 'filter-level', 'filter-metro'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    const key = el.dataset.filterKey;
                    if (key) {
                        filters[key] = e.target.value;
                        filters.shortcut = 'all'; // Clear shortcut when manually tweaking
                        updateUrlState();
                        renderJobs();
                    }
                });
            }
        });

        // Quick Chips in Toolbar
        document.querySelectorAll('.quick-chip-btn').forEach(chip => {
            chip.addEventListener('click', () => {
                const sc = chip.dataset.shortcut;
                filters.shortcut = sc;

                if (sc !== 'all') {
                    // Reset dropdowns to defaults when shortcut clicked
                    filters.function = 'all';
                    filters.level = 'all';
                    filters.metro = defaultMetro;
                    filters.company = 'all';
                }

                updateUrlState();
                renderJobs();
            });
        });

        // Clear Filters Button
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                filters.function = 'all';
                filters.level = 'all';
                filters.metro = defaultMetro;
                filters.workplace = 'all';
                filters.company = 'all';
                filters.shortcut = 'all';
                filters.search = '';
                if (searchInput) searchInput.value = '';
                updateUrlState();
                renderJobs();
            });
        }

        // Curated Shortcut Chips (Legacy / Austin)
        document.querySelectorAll('.shortcut-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.shortcut-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                
                const sc = chip.dataset.shortcut;
                filters.shortcut = sc;

                if (sc !== 'all') {
                    filters.function = 'all';
                    filters.level = 'all';
                    filters.metro = 'all';
                    filters.workplace = 'all';
                    filters.company = 'all';
                    if (companySelect) companySelect.value = 'all';
                }

                updateUrlState();
                renderJobs();
            });
        });

        // Pill Buttons (for Austin page or legacy pills)
        document.querySelectorAll('.pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.filterKey;
                const val = btn.dataset.filterVal;
                if (!key || !val) return;

                const parentGroup = btn.closest('.filter-pills');
                if (parentGroup) {
                    parentGroup.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }

                document.querySelectorAll('.shortcut-chip').forEach(c => c.classList.remove('active'));
                filters.shortcut = 'all';

                filters[key] = val;
                updateUrlState();
                renderJobs();
            });
        });

        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    filters.search = e.target.value;
                    updateUrlState();
                    renderJobs();
                }, 180);
            });
        }

        if (companySelect) {
            companySelect.addEventListener('change', (e) => {
                filters.company = e.target.value;
                updateUrlState();
                renderJobs();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                filters.sort = e.target.value;
                updateUrlState();
                renderJobs();
            });
        }

        document.querySelectorAll('.tracker-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tracker-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                filters.trackerTab = tab.dataset.tab;
                renderJobs();
            });
        });
    }

    // Load Data
    fetch('jobs.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return response.json();
        })
        .then(data => {
            allRawJobs = (data || []).map(normalizeJob);

            if (navCountBadge) {
                const naCount = allRawJobs.filter(j => isJobFintech(j) && j.is_na).length;
                navCountBadge.textContent = `${naCount.toLocaleString()}+ Active Roles`;
            }

            const pageJobs = pageMode === 'fintech' 
                ? allRawJobs.filter(isJobFintech) 
                : allRawJobs.filter(isJobAustinSeniorTech);
            populateCompanyDropdown(pageJobs);
            populateSavedViewsDropdown();

            readUrlFilters();
            setupEventListeners();
            renderJobs();
            updateTrackerCounters();
        })
        .catch(err => {
            console.error('Error loading jobs:', err);
            jobsContainer.innerHTML = `
                <div class="state-message">
                    <div class="state-icon">⚠️</div>
                    <div class="state-title">Unable to load jobs data</div>
                    <p class="state-desc">${err.message}. Please verify jobs.json exists or run the scraper.</p>
                </div>
            `;
        });
});
