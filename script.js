// Convoking4 Snapshot Assessment
// Version: 9.3 (Phase 2 - Comprehensive & Fixed)
// Date: August 20, 2025

(function() {
    // --- GLOBAL STATE ---
    let activeOrganization = null;
    let currentAssessmentType = null;

    // --- DOM ELEMENTS ---
    const chooserView = document.getElementById('chooser-view');
    const appView = document.getElementById('app-view');
    const assessOrgButton = document.getElementById('assess-org-button');
    const assessUndertakingButton = document.getElementById('assess-undertaking-button');
    const briefingContainer = document.getElementById('briefing-document-container');
    const briefingContent = document.getElementById('briefing-document-content');
    const returnToMenuButton = document.getElementById('return-to-menu-button');
    const undertakingLoaderContainer = document.getElementById('undertaking-loader-container');
    const loadAiReportLabel = document.getElementById('load-ai-report-label');
    
    const form = document.getElementById('profile-form');
    const formContainer = document.getElementById('dynamic-form-content');
    const navLinksContainer = document.getElementById('nav-links-container');
    const saveButton = document.getElementById('generate-button');
    const clearButton = document.getElementById('clear-form-button');
    const orgFileLoader = document.getElementById('org-file-loader');
    const aiReportLoader = document.getElementById('ai-report-loader');
    
    const aiPromptModal = document.getElementById('ai-prompt-modal');
    const aiPromptOutput = document.getElementById('ai-prompt-output');
    const selectPromptButton = document.getElementById('select-prompt-button');
    const closeModalButtons = document.querySelectorAll('#close-modal-button-top, #close-modal-button-bottom');

    let isDirty = false;
    let isRepopulating = false;

    // --- FORM FIELD FACTORY FUNCTIONS ---
    const createTextField = (id, title, description, rows = 3, path, example = '') => {
        return `<div class="form-group">
                    <label for="${id}" class="main-label">${title}</label>
                    ${description ? `<p class="description">${description}</p>` : ''}
                    ${example ? `<p class="option-example">${example}</p>` : ''}
                    <textarea id="${id}" rows="${rows}" data-path="${path}"></textarea>
                </div>`;
    };

    const createInputField = (id, title, description, path, example = '', type = 'text', attributes = {}) => {
        const attrString = Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ');
        return `<div class="form-group">
                    <label for="${id}" class="main-label">${title}</label>
                    ${description ? `<p class="description">${description}</p>` : ''}
                    ${example ? `<p class="option-example">${example}</p>` : ''}
                    <input type="${type}" id="${id}" data-path="${path}" ${attrString}>
                </div>`;
    };
    
    const createSelectField = (id, title, description, path, options, example = '') => {
        let optionsHTML = '<option value="">Select...</option>' + options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
        return `<div class="form-group">
                    <label for="${id}" class="main-label">${title}</label>
                    ${description ? `<p class="description">${description}</p>` : ''}
                    ${example ? `<p class="option-example">${example}</p>` : ''}
                    <select id="${id}" data-path="${path}">${optionsHTML}</select>
                </div>`;
    };

    const createMultiChoice = (id, title, description, type, options, path) => {
        let optionsHTML = options.map(opt => {
            const uniqueId = `${id}-${opt.label.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            const optDescription = opt.description ? `<p class="option-description">${opt.description}</p>` : '';
            const showFor = opt.showFor ? `data-show-for="${opt.showFor.join(',')}"` : '';
            const containerClass = opt.showFor ? 'conditional-field' : '';

            return `<div class="input-group-container ${containerClass}" ${showFor}>
                        <div class="input-group">
                            <input type="${type}" id="${uniqueId}" name="${id}" value="${opt.label}" data-path="${path}">
                            <label for="${uniqueId}">${opt.label}</label>
                        </div>
                        ${optDescription}
                    </div>`;
        }).join('');

        return `<div class="form-group">
                    <label class="main-label">${title}</label>
                    ${description ? `<p class="description">${description}</p>` : ''}
                    <div class="${type}-group">${optionsHTML}</div>
                </div>`;
    };

    const createSlider = (id, title, description, path, minLabel = 'Low', maxLabel = 'High') => {
        return `<div class="form-group">
                    <label for="${id}" class="main-label">${title}</label>
                    ${description ? `<p class="description">${description}</p>` : ''}
                    <div class="slider-container">
                        <span class="slider-label">${minLabel}</span>
                        <input type="range" id="${id}" min="1" max="10" value="5" class="confidence-slider" data-path="${path}">
                        <span class="slider-label">${maxLabel}</span>
                    </div>
                </div>`;
    };

    // --- ASSESSMENT BLUEPRINTS ---

    const organizationalSections = [
        {
            title: "Section 1: Basic Information", id: "section-basic-info", path: "basicInfo",
            description: "Start with the basics. This helps identify the organization and its context.",
            parts: [
                createInputField("org-name", "1.1 Organization Name", "", "basicInfo.organizationName", "", "text", {required: true}),
                createInputField("org-year", "1.2 Year Founded", "", "basicInfo.yearFounded", "", "number"),
                createInputField("org-city", "1.3 Primary City", "", "basicInfo.city"),
                createInputField("org-country", "1.4 Primary Country", "", "basicInfo.country"),
            ]
        },
        {
            title: "Section 2: Organization Identity", id: "section-identity", path: "identity",
            description: "Define the core operational, legal, and purposeful structure of your organization.",
            parts: [
                createMultiChoice("org-archetype", "2.1 Primary Organizational Archetype", "Select the option that best describes your organization's fundamental purpose.", "radio", [
                    {label: "For-Profit Business"}, {label: "Mission-Driven Organization"}, {label: "Member/Community-Based Organization"}, {label: "Hybrid Organization"}, {label: "Uncertain"}
                ], "identity.archetype"),
                createMultiChoice("funding-model", "2.2 Primary Funding Model", "How does your organization primarily finance its operations?", "radio", [
                    {label: "Revenue from Services/Products", showFor: ["For-Profit Business", "Hybrid Organization"]},
                    {label: "Donations/Grants", showFor: ["Mission-Driven Organization", "Hybrid Organization"]},
                    {label: "Membership Fees", showFor: ["Member/Community-Based Organization"]},
                    {label: "Bootstrapping", showFor: ["For-Profit Business"]},
                    {label: "Uncertain"}
                ], "identity.fundingModel"),
                createMultiChoice("legal-structure", "2.3 Legal Structure", "What is your organization's legal form?", "radio", [
                    {label: "LLC", showFor: ["For-Profit Business", "Hybrid Organization"]},
                    {label: "Corporation (C-Corp/S-Corp)", showFor: ["For-Profit Business", "Hybrid Organization"]},
                    {label: "Nonprofit/NGO", showFor: ["Mission-Driven Organization"]},
                    {label: "Pre-Formal/Informal"}, {label: "Uncertain"}
                ], "identity.legalStructure"),
            ]
        },
        {
            title: "Section 3: Core Strategy", id: "section-strategy", path: "strategy",
            description: "Define your organization's strategic direction.",
            parts: [
                 createTextField("mission-statement", "3.1 Mission Statement", "Your 'Why'. What is your organization's core purpose?", 3, "strategy.missionStatement"),
                 createTextField("core-values", "3.2 Core Values & a Recent Example", "For one of your core values, describe a specific, recent example of how the team lived (or failed to live) that value.", 4, "strategy.valuesAndBehaviors", "Example: Value: Customer Obsession. Behavior: An engineer stayed up all night to fix a single customer's critical bug."),
            ]
        },
        {
            title: "Section 4: Key Performance Indicators (KPIs)", id: "section-kpis", path: "kpis",
            description: "Strategy without data is speculation. Provide core metrics to create a quantitative baseline.",
            parts: [
                createMultiChoice("financial-metrics-checkboxes", "4.1 Financial Metrics", "Select all relevant financial indicators.", "checkbox", [
                    {label: "Annual Recurring Revenue (ARR)"}, {label: "Monthly Burn Rate"}, {label: "Cash Runway (Months)"}, {label: "LTV:CAC Ratio"}, {label: "Gross Margin"}
                ], "kpis.financialMetrics"),
                createSelectField("important-financial-metric-select", "Of those, which is the SINGLE most important financial metric right now?", "", "kpis.mostImportantFinancial", []),
                createMultiChoice("customer-metrics-checkboxes", "4.2 Customer Metrics", "Select all relevant customer health indicators.", "checkbox", [
                    {label: "Active Users/Customers"}, {label: "Churn Rate (%)"}, {label: "Net Promoter Score (NPS)"}, {label: "Customer Satisfaction (CSAT)"}, {label: "Customer Retention Rate"}
                ], "kpis.customerMetrics"),
                createSelectField("important-customer-metric-select", "Of those, which is the SINGLE most important customer metric right now?", "", "kpis.mostImportantCustomer", [])
            ]
        }
    ];

    const undertakingSections = [
        {
            title: "Section 1: Undertaking Identity", id: "section-undertaking-id", path: "undertakingInfo",
            description: "Define the core purpose and goals of this specific project or initiative.",
            parts: [
                createInputField("undertaking-name", "1.1 Undertaking Name", "", "undertakingInfo.name", "e.g., Q3 Product Launch", "text", {required: true}),
                createTextField("undertaking-mission", "1.2 Mission Statement", "What is the core purpose of this undertaking? What problem does it solve?", 3, "undertakingInfo.mission"),
            ]
        },
        {
            title: "Section 2: Beneficiaries & Stakeholders", id: "section-undertaking-stakeholders", path: "undertakingStakeholders",
            description: "Define who this undertaking serves and who is involved in its success.",
            parts: [
                createTextField("beneficiaries", "2.1 Primary Beneficiaries", "Who will directly benefit from the success of this undertaking? (e.g., customers, community members, internal teams)", 3, "undertakingStakeholders.beneficiaries"),
                createTextField("key-stakeholders", "2.2 Key Stakeholders", "List the key people or teams whose support is critical for this undertaking to succeed.", 3, "undertakingStakeholders.keyStakeholders"),
            ]
        },
        {
            title: "Section 3: Project KPIs & Resources", id: "section-undertaking-kpis", path: "undertakingKpis",
            description: "Define how success will be measured and what resources are required.",
            parts: [
                createTextField("success-metrics", "3.1 Success Metrics", "List 2-3 specific, measurable KPIs for this undertaking.", 3, "undertakingKpis.successMetrics", "e.g., Achieve 500 new user sign-ups; Reduce customer support tickets by 15%"),
                createTextField("resources", "3.2 Required Resources", "What is the estimated budget, team, and timeline for this undertaking?", 3, "undertakingKpis.resources"),
            ]
        },
    ];

    // --- APPLICATION CONTROLLER LOGIC ---

    const initializeApp = () => {
        showChooserView();

        assessOrgButton.addEventListener('click', () => {
            currentAssessmentType = 'organization';
            renderForm(organizationalSections);
        });

        assessUndertakingButton.addEventListener('click', () => {
            currentAssessmentType = 'undertaking';
            showUndertakingLoader();
        });

        orgFileLoader.addEventListener('change', handleOrgFileLoadForUndertaking);
        aiReportLoader.addEventListener('change', handleAiReportLoad);
        returnToMenuButton.addEventListener('click', showChooserView);
    };

    const showChooserView = () => {
        appView.classList.add('hidden');
        chooserView.classList.remove('hidden');
        activeOrganization = null;
        currentAssessmentType = null;
        briefingContainer.classList.add('hidden');
        undertakingLoaderContainer.classList.add('hidden');
        form.reset();
        formContainer.innerHTML = '';
        navLinksContainer.innerHTML = '';
    };
    
    const showUndertakingLoader = () => {
        chooserView.classList.add('hidden');
        appView.classList.remove('hidden');
        form.reset();
        formContainer.innerHTML = '';
        navLinksContainer.innerHTML = '';
        saveButton.classList.add('hidden');
        undertakingLoaderContainer.classList.remove('hidden');
        loadAiReportLabel.classList.add('disabled');
    };

    const renderForm = (sections) => {
        undertakingLoaderContainer.classList.add('hidden');
        saveButton.classList.remove('hidden');

        const formHtml = [];
        const navHtml = [];
        sections.forEach(section => {
            const navTitle = section.title.includes(':') ? section.title.split(':')[1].trim() : section.title;
            formHtml.push(`<h2 id="${section.id}">${section.title}</h2>`);
            if (section.description) { formHtml.push(`<p class="section-explanation">${section.description}</p>`); }
            formHtml.push(`<fieldset>${section.parts.join('')}</fieldset>`);
            navHtml.push(`<li><a href="#${section.id}">${navTitle}</a></li>`);
        });
        
        formContainer.innerHTML = formHtml.join('');
        navLinksContainer.innerHTML = navHtml.join('');
        
        updateKpiDropdowns();
    };

    const handleOrgFileLoadForUndertaking = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.metadata || !data.basicInfo) {
                    throw new Error("This does not appear to be a valid Organizational Snapshot file.");
                }
                activeOrganization = data;
                showNotification(`Loaded context from "${activeOrganization.basicInfo.organizationName}". Now, please load the corresponding AI Diagnostic Report.`, 'success');
                loadAiReportLabel.classList.remove('disabled');
            } catch (error) {
                console.error('Error parsing organization file:', error);
                showNotification(error.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = null;
    };

    const handleAiReportLoad = (event) => {
        if (!activeOrganization) {
            showNotification('Please load the parent organization snapshot first.', 'error');
            return;
        }
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            briefingContent.textContent = e.target.result;
            briefingContainer.classList.remove('hidden');
            renderForm(undertakingSections);
            showNotification(`AI Diagnostic Report loaded. You can now begin the Undertaking Snapshot.`, 'success');
        };
        reader.readAsText(file);
        event.target.value = null;
    };

    const saveProfileToFile = () => {
        const data = gatherFormData();
        let type, name, descriptor, date, fileName;

        if (currentAssessmentType === 'organization') {
            if (!data.basicInfo || !data.basicInfo.organizationName) {
                showNotification('Please enter an Organization Name first.', 'error');
                return;
            }
            type = 'org';
            name = data.basicInfo.organizationName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        } else if (currentAssessmentType === 'undertaking') {
            if (!data.undertakingInfo || !data.undertakingInfo.name) {
                showNotification('Please enter an Undertaking Name first.', 'error');
                return;
            }
            if (activeOrganization && activeOrganization.metadata) {
                data.metadata.parentOrganizationId = activeOrganization.metadata.snapshotId || activeOrganization.basicInfo.organizationName;
            }
            type = 'undertaking';
            name = data.undertakingInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        }

        descriptor = 'snapshot';
        date = new Date().toISOString().split('T')[0];
        fileName = `${type}_${name}_${descriptor}_${date}.json`;

        const fileContent = JSON.stringify(data, null, 2);
        const blob = new Blob([fileContent], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    };
    
    const gatherFormData = () => {
        const data = { metadata: { type: currentAssessmentType } };
        form.querySelectorAll('[data-path]').forEach(el => {
            const path = el.dataset.path;
            if (el.type === 'radio' && el.checked) {
                set(data, path, el.value);
            } else if (el.type === 'checkbox') {
                let currentVal = getValueFromPath(data, path) || [];
                if (el.checked && !currentVal.includes(el.value)) {
                    currentVal.push(el.value);
                } else if (!el.checked && currentVal.includes(el.value)) {
                    currentVal = currentVal.filter(v => v !== el.value);
                }
                set(data, path, currentVal);
            } else if (el.value) {
                set(data, path, el.value);
            }
        });
        return data;
    };
    
    const set = (obj, path, value) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') { current[key] = {}; }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    };

    const getValueFromPath = (obj, path) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    const updateKpiDropdowns = () => {
        // This function is a placeholder for now as KPIs are not in the simplified blueprints
    };

    const showNotification = (message, type = 'success') => {
        const banner = document.getElementById('notification-banner');
        if(!banner) return;
        banner.textContent = message;
        banner.className = `is-visible is-${type}`;
        setTimeout(() => { banner.className = ''; }, 4000);
    };

    // --- EVENT LISTENERS ---
    saveButton.addEventListener('click', saveProfileToFile);
    form.addEventListener('click', (e) => {
        if (e.target.id === 'consult-ai-button') {
            // Placeholder for AI Prompt Generation
            showNotification("AI Prompt generation is not fully implemented in this version.", "info");
        }
    });
    
    if (closeModalButtons) {
        closeModalButtons.forEach(button => button.addEventListener('click', () => aiPromptModal.close()));
    }
    if (selectPromptButton) {
        selectPromptButton.addEventListener('click', () => {
            aiPromptOutput.select();
            aiPromptOutput.setSelectionRange(0, aiPromptOutput.value.length);
            try {
                navigator.clipboard.writeText(aiPromptOutput.value);
                showNotification('Prompt copied to clipboard!', 'success');
            } catch (err) {
                showNotification('Could not copy text.', 'error');
            }
        });
    }
    
    // --- INITIALIZATION ---
    initializeApp();

})();

