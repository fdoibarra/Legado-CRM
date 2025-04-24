(function() {
    // --- Configuration ---
    const statuses = ['Nuevo contacto', 'Seguimiento Realizado', 'Potencial', 'Asistio', 'Descartado', 'Cerrado'];
    const RATING_MAX = 5;
    const interestOptions = ["", "Kasa del Mar", "Encanto del Valle", "Villas San Angel", "Real del Monte", "Hacienda Calafia", "Mar de Calafia"];

    // --- State ---
    let leads = [];
    let currentLeadIndex = null;
    let taskToComplete = { leadIndex: null, taskIndex: null };

    // --- DOM Element Variables (Declared here, assigned in DOMContentLoaded) ---
    let pipeline, columnTemplate, modal, modalContent, modalCloseBtn, btnAddLead, btnCancel,
        btnAddTask, modalTitle, mName, mPhone, mEmail, mInterest, mStatus, mComment,
        btnAddComment, commentHistory, starContainer, taskList, taskHistoryList, tType,
        tDate, tTime, tNotes, themeToggleButton, notificationButton, notificationBadge,
        calendarButton, taskListModal, taskListModalCloseBtn, calendarViewContent,
        taskCompletionModal, taskCompletionModalContent, taskCompletionModalTitle,
        taskCompletionModalClose, taskCompletionSuccessYes, taskOutcomeComment,
        taskCompletionCancel, taskCompletionSave, darkIcon, lightIcon,
        commentsToggleBtn, commentsContent, commentsToggleIcon, tasksMainToggleBtn,
        tasksMainContent, tasksMainToggleIcon, addTaskToggleBtn, addTaskForm,
        addTaskToggleIcon, btnCallFromModal, btnWhatsAppFromModal, btnEmailFromModal,
        taskHistoryContent, taskHistoryToggleIcon, taskHistoryToggleBtn; // Ensure taskHistoryToggleBtn is here

    // --- Dark Mode Logic ---
    const applyThemePreference = () => {
        const pref = localStorage.getItem('theme');
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = pref === 'dark' || (!pref && sys);
        document.documentElement.classList.toggle('dark', isDark);
        darkIcon?.classList.toggle('hidden', !isDark);
        lightIcon?.classList.toggle('hidden', isDark);
        // Also toggle 'dark' class on select elements if they exist
        mInterest?.classList.toggle('dark', isDark);
        mStatus?.classList.toggle('dark', isDark);
        tType?.classList.toggle('dark', isDark);
    };
    const toggleDarkMode = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        applyThemePreference();
    };

    // --- Utility Functions ---
    const saveLeadsToStorage = () => { try { localStorage.setItem('leads', JSON.stringify(leads)); console.log("Leads saved."); } catch (e) { console.error("Error saving leads:", e); } };
    const loadLeadsFromStorage = () => {
         try {
            const d = localStorage.getItem('leads');
            leads = d ? JSON.parse(d) : [];
            leads.forEach(l => {
                 l.id = l.id || Date.now().toString(36) + Math.random().toString(36).substring(2);
                 l.email = l.email || '';
                 l.comments = l.comments || [];
                 l.calls = l.calls || 0;
                 l.tasks = l.tasks || [];
                 l.rating = l.rating || 0;
                 l.created = l.created || Date.now();
                 l.lastComment = l.lastComment || '';
                 l.status = statuses.includes(l.status) ? l.status : statuses[0];
                 l.interest = l.interest || '';
                 l.tasks.forEach(t => {
                    t.id = t.id || Date.now().toString(36) + Math.random().toString(36).substring(2);
                    t.done = t.done === true;
                    t.completionStatus = t.completionStatus || null;
                    t.completionComment = t.completionComment || '';
                    t.notes = t.notes || '';
                });
             });
             console.log("Leads loaded.");
         } catch (e) { console.error("Error loading leads:", e); leads = []; }
     };
    const formatDate = (ts) => ts ? new Date(ts).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
    const formatTaskDateTime = (d, t) => { const dp = d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha'; const tp = t || ''; return `${dp} ${tp}`.trim(); }
    const getTodayDateString = () => { const today = new Date(); const year = today.getFullYear(); const month = String(today.getMonth() + 1).padStart(2, '0'); const day = String(today.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
    const hideAllCardActions = () => { document.querySelectorAll('.lead-card-actions').forEach(actionsDiv => { actionsDiv.classList.add('hidden'); }); };

    // --- Secciones Colapsables Logic ---
    const toggleSection = (contentElement, iconElement) => {
        if (!contentElement || !iconElement) { console.warn("Toggle target not found for:", contentElement, iconElement); return; }
        const isHidden = contentElement.classList.toggle('hidden');
        iconElement.classList.toggle('fa-chevron-down', isHidden);
        iconElement.classList.toggle('fa-chevron-up', !isHidden);
    };

    // --- Autosave Lead Data Function ---
    const updateLeadDataFromModal = () => {
         if (currentLeadIndex === null || !leads[currentLeadIndex]) return false;
         const lead = leads[currentLeadIndex];
         const currentRating = starContainer?.querySelectorAll('.fa-star.text-yellow-400').length ?? lead.rating;
         const data = { name: mName.value.trim(), phone: mPhone.value.trim(), email: mEmail.value.trim(), interest: mInterest.value, status: mStatus.value, rating: currentRating };
         let changed = false; for(const key in data) { if (data[key] !== lead[key]) { changed = true; break; } } if (!changed) return false;
         Object.assign(lead, data);
         console.log("Lead data updated in memory for saving:", lead.name);
         return true;
     };

    // --- Modal Functions (Main Lead Modal) ---
    const closeModal = () => {
         if (currentLeadIndex !== null) { if(updateLeadDataFromModal()) { saveLeadsToStorage(); renderPipeline(); updateNotificationBadge(); } }
         modal.classList.add('opacity-0'); modalContent.classList.add('scale-95');
         setTimeout(() => { modal.classList.add('hidden'); }, 300);
         currentLeadIndex = null;
     };
    const openModal = (leadIndex = null) => {
         console.log("Attempting to open lead modal for index:", leadIndex);
         currentLeadIndex = leadIndex; populateStatusDropdown(); populateInterestDropdown();
         if (currentLeadIndex !== null && leads[currentLeadIndex]) {
            const lead = leads[currentLeadIndex];
            modalTitle.textContent = `Perfil: ${lead.name || 'Sin Nombre'}`;
            mName.value = lead.name || '';
            mPhone.value = lead.phone || '';
            mEmail.value = lead.email || '';
            mInterest.value = lead.interest || '';
            mStatus.value = lead.status || statuses[0];
            mComment.value = '';
            renderRating(lead.rating || 0);
            renderComments(lead);
            renderTasks(lead);
        } else {
            modalTitle.textContent = 'Añadir Nuevo Lead';
            mName.value = ''; mPhone.value = ''; mEmail.value = ''; mInterest.value = ''; mStatus.value = statuses[0]; mComment.value = '';
            commentHistory.innerHTML = '<li class="text-sub text-sm">No hay comentarios aún.</li>';
            taskList.innerHTML = '<li class="text-sub text-sm">No hay tareas pendientes.</li>';
            taskHistoryList.innerHTML = '<li class="text-sub text-sm">No hay tareas completadas.</li>';
            renderRating(0);
            tDate.value = ''; tTime.value = ''; tNotes.value = '';
        }
         // Resetear Secciones Colapsables (Todas cerradas por defecto)
         [commentsContent, tasksMainContent, addTaskForm, document.getElementById('task-history-subsection')?.querySelector('.history-bg + div')] // Adjusted to target task history content if needed
             .forEach(el => el?.classList.add('hidden'));
         [commentsToggleIcon, tasksMainToggleIcon, addTaskToggleIcon, taskHistoryToggleIcon] // taskHistoryToggleIcon exists
             .forEach(el => { el?.classList.remove('fa-chevron-up'); el?.classList.add('fa-chevron-down'); });

         modal.classList.remove('hidden');
         requestAnimationFrame(() => {
             modal.classList.remove('opacity-0');
             modalContent.classList.remove('scale-95');
         });
         mName.focus();
         console.log("Lead modal opened.");
     };

    // --- Task List Modal Functions ---
    const closeTaskListModal = () => { taskListModal.classList.add('opacity-0'); taskListModal.querySelector('div:first-child').classList.add('scale-95'); setTimeout(() => { taskListModal.classList.add('hidden'); }, 300); };
    const openTaskListModal = () => { console.log("Opening task list modal..."); renderTaskListModalContent(); taskListModal.classList.remove('hidden'); requestAnimationFrame(() => { taskListModal.classList.remove('opacity-0'); taskListModal.querySelector('div:first-child').classList.remove('scale-95'); }); };
    const renderTaskListModalContent = () => {
         calendarViewContent.innerHTML = ''; const todayStr = getTodayDateString(); let tasksByDate = {};
         leads.forEach((lead, leadIndex) => { lead.tasks.forEach((task) => { if (!task.done) { const dateKey = task.date || 'Sin Fecha'; if (!tasksByDate[dateKey]) { tasksByDate[dateKey] = []; } tasksByDate[dateKey].push({ ...task, leadName: lead.name, leadId: lead.id, leadIndex }); } }); });
         const sortedDates = Object.keys(tasksByDate).sort((a, b) => { if (a === 'Sin Fecha') return 1; if (b === 'Sin Fecha') return -1; return new Date(a) - new Date(b); });
         if (sortedDates.length === 0) { calendarViewContent.innerHTML = '<p class="text-sub">No hay tareas pendientes.</p>'; return; }
         const container = document.createElement('div'); container.className = 'space-y-4';
         sortedDates.forEach(dateKey => {
             const dateSection = document.createElement('div'); const dateTitle = document.createElement('h4'); const isToday = dateKey === todayStr; const isOverdue = dateKey !== 'Sin Fecha' && dateKey < todayStr; let dateDisplay = dateKey; if (dateKey !== 'Sin Fecha') { try { dateDisplay = new Date(dateKey + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); } catch(e){} }
             dateTitle.className = `text-lg font-semibold text-main mb-2 pb-1 border-b section-border ${isToday ? 'text-secondary dark:text-dark-secondary' : isOverdue ? 'text-red-500 dark:text-red-400' : ''}`; dateTitle.textContent = dateDisplay + (isToday ? ' (Hoy)' : isOverdue ? ' (Vencida)' : dateKey === 'Sin Fecha' ? ' (Sin Fecha)' : ''); dateSection.appendChild(dateTitle);
             const taskListUl = document.createElement('ul'); taskListUl.className = 'space-y-3 pl-2';
             tasksByDate[dateKey].sort((a, b) => { const timeA = a.time || '99:99'; const timeB = b.time || '99:99'; return timeA.localeCompare(timeB); });
             tasksByDate[dateKey].forEach(task => {
                 const li = document.createElement('li'); li.className = `p-3 rounded border section-border ${isToday ? 'border-secondary dark:border-dark-secondary bg-secondary/10' : isOverdue ? 'border-red-500 dark:border-red-400 bg-red-500/10' : ''}`; const icon = task.type === 'Llamada' ? 'fa-phone' : task.type === 'Mensaje' ? 'fa-comments' : task.type === 'Reunión' ? 'fa-users' : task.type === 'Email' ? 'fa-envelope' : 'fa-tasks';
                 li.innerHTML = `<div class="flex justify-between items-center mb-1"><span class="font-semibold text-main flex items-center"><i class="fas ${icon} mr-2 text-secondary dark:text-dark-secondary w-4 text-center"></i> ${task.type}</span><span class="text-sm text-sub">${task.time || 'Sin hora'}</span></div><div class="text-sm text-sub ml-6">Lead: <button data-action="open-lead" data-lead-index="${task.leadIndex}" class="text-primary dark:text-dark-accent hover:underline">${task.leadName || 'Sin Nombre'}</button></div>${ task.notes ? `<p class="text-xs text-sub ml-6 mt-1 pt-1 border-t section-border"><em>Nota: ${task.notes}</em></p>`: ''}${ (task.type === 'Reunión' || task.type === 'Llamada') && leads[task.leadIndex]?.email ? `<div class="text-right mt-1"><button data-action="gcal" data-lead-index="${task.leadIndex}" data-task-id="${task.id}" class="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 rounded inline-flex items-center"><i class="fab fa-google mr-1"></i> Añadir a GCal</button></div>` : '' }`; taskListUl.appendChild(li);
             }); dateSection.appendChild(taskListUl); container.appendChild(dateSection);
         }); calendarViewContent.appendChild(container);
     };

    // --- Task Completion Modal Functions ---
    const openTaskCompletionModal = (leadIndex, taskIndex) => {
        console.log("Opening task completion modal...");
        if (leadIndex === null || taskIndex === null || !leads[leadIndex] || !leads[leadIndex].tasks[taskIndex]) { console.error("Invalid lead/task index for completion modal"); return; }
        taskToComplete = { leadIndex, taskIndex };
        const task = leads[leadIndex].tasks[taskIndex];
        taskCompletionModalTitle.textContent = `Completar: ${task.type}`;
        taskOutcomeComment.value = '';
        // Ensure radio buttons exist before trying to access checked property
        const successYesRadio = taskCompletionModal.querySelector('input[name="taskSuccess"][value="yes"]');
        if (successYesRadio) successYesRadio.checked = true;
        taskCompletionModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            taskCompletionModal.classList.remove('opacity-0');
            // Check if taskCompletionModalContent exists before adding class
            taskCompletionModalContent?.classList.remove('scale-95');
            taskOutcomeComment.focus();
        });
    };
    const closeTaskCompletionModal = () => {
        taskCompletionModal.classList.add('opacity-0');
        taskCompletionModalContent?.classList.add('scale-95'); // Check existence
        setTimeout(() => { taskCompletionModal.classList.add('hidden'); }, 300);
        taskToComplete = { leadIndex: null, taskIndex: null };
    };
    const saveTaskCompletion = () => {
         const { leadIndex, taskIndex } = taskToComplete;
         if (leadIndex === null || taskIndex === null || !leads[leadIndex] || !leads[leadIndex].tasks[taskIndex]) { console.error("Cannot save: Invalid lead/task index"); return; }
         const comment = taskOutcomeComment.value.trim();
         if (!comment) { alert("Por favor, añade un comentario."); taskOutcomeComment.focus(); return; }
         const lead = leads[leadIndex];
         const task = lead.tasks[taskIndex];
         const successYesRadio = taskCompletionModal.querySelector('input[name="taskSuccess"][value="yes"]'); // Re-select it
         const successStatus = successYesRadio?.checked ? 'Éxito' : 'Falló'; // Check if radio button exists

         task.done = true;
         task.completionStatus = successStatus;
         task.completed = Date.now();
         task.completionComment = comment;

         const historyComment = `Tarea Completada (${task.type} - ${successStatus}): ${comment}`;
         lead.comments.push({ text: historyComment, timestamp: Date.now() });
         lead.lastComment = historyComment;

         saveLeadsToStorage();
         closeTaskCompletionModal();
         renderPipeline();
         updateNotificationBadge();

         // Update modal content only if the correct lead modal is currently open
         if (currentLeadIndex === leadIndex && !modal.classList.contains('hidden')) {
             renderTasks(lead);
             renderComments(lead);
         }
         // Update task list modal if open
         if (!taskListModal.classList.contains('hidden')) {
             renderTaskListModalContent();
         }
     };

    // --- Rating Functions ---
    const createStar = (idx, rating) => { const s = document.createElement('i'); s.className = `fas fa-star text-xl cursor-pointer transition duration-200 ${idx <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300 dark:hover:text-yellow-500'}`; s.dataset.index = idx; s.setAttribute('role', 'radio'); s.setAttribute('aria-label', `${idx} estrella${idx > 1 ? 's' : ''}`); s.setAttribute('aria-checked', idx <= rating); return s; };
    const renderRating = (rating) => { if (!starContainer) return; starContainer.innerHTML = ''; for (let i = 1; i <= RATING_MAX; i++) starContainer.appendChild(createStar(i, rating)); };
    const handleStarClick = (e) => { const s = e.target.closest('.fa-star'); if (!s || currentLeadIndex === null || !leads[currentLeadIndex]) return; const r = parseInt(s.dataset.index, 10); const l = leads[currentLeadIndex]; l.rating = (l.rating === r) ? r - 1 : r; renderRating(l.rating); };

    // --- Task Rendering and Actions ---
    const createTaskItem = (task, leadIdx, taskIdx) => { const li = document.createElement('li'); li.className = `p-3 rounded border section-border bg-white dark:bg-dark-bg-card shadow-sm space-y-2`; const icon = task.type === 'Llamada' ? 'fa-phone' : task.type === 'Mensaje' ? 'fa-comments' : task.type === 'Reunión' ? 'fa-users' : task.type === 'Email' ? 'fa-envelope' : 'fa-tasks'; li.innerHTML = `<div class="flex justify-between items-center"><span class="font-semibold text-main flex items-center"><i class="fas ${icon} mr-2 text-secondary dark:text-dark-secondary w-4 text-center"></i> ${task.type}</span><span class="text-xs text-sub">${formatTaskDateTime(task.date, task.time)}</span></div> ${task.notes ? `<p class="text-sm text-sub border-t section-border pt-2">${task.notes}</p>` : ''} <div class="text-right"><button data-action="toggle-task" data-lead-index="${leadIdx}" data-task-index="${taskIdx}" class="px-2 py-1 text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-700 rounded focus:outline-none" title="Marcar como hecha"><i class="fas fa-check mr-1"></i> Completar</button></div>`; return li; };
    const createTaskHistoryItem = (task, leadIdx, taskIdx) => { const li = document.createElement('li'); li.className = `p-3 rounded border section-border bg-gray-50 dark:bg-gray-700/50 opacity-80`; const icon = task.type === 'Llamada' ? 'fa-phone' : task.type === 'Mensaje' ? 'fa-comments' : task.type === 'Reunión' ? 'fa-users' : task.type === 'Email' ? 'fa-envelope' : 'fa-tasks'; const statusClass = task.completionStatus === 'Éxito' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'; li.innerHTML = `<div class="flex justify-between items-center mb-1"><span class="font-semibold text-sub flex items-center line-through"><i class="fas ${icon} mr-2 w-4 text-center"></i> ${task.type}</span><span class="text-xs text-sub">${formatDate(task.completed)}</span></div> ${task.completionComment ? `<p class="text-sm text-sub pl-6 border-t section-border pt-1 mt-1"><strong class="${statusClass}">[${task.completionStatus || 'Completada'}]</strong> ${task.completionComment}</p>` : `<p class="text-sm text-sub pl-6 border-t section-border pt-1 mt-1 italic">[Sin comentario de resultado]</p>`} <div class="text-right mt-1"><button data-action="toggle-task" data-lead-index="${leadIdx}" data-task-index="${taskIdx}" class="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-700 rounded focus:outline-none" title="Marcar como pendiente (Reabrir)"><i class="fas fa-undo mr-1"></i> Reabrir</button></div>`; return li; };
    const renderTasks = (lead) => { if(!taskList || !taskHistoryList) return; taskList.innerHTML = ''; taskHistoryList.innerHTML = ''; const pendingTasks = lead.tasks.filter(task => !task.done); const completedTasks = lead.tasks.filter(task => task.done); if (pendingTasks.length === 0) { taskList.innerHTML = '<li class="text-sub text-sm">No hay tareas pendientes.</li>'; } else { pendingTasks.sort((a, b) => { const dA = new Date(`${a.date || '9999-12-31'}T${a.time || '00:00'}`); const dB = new Date(`${b.date || '9999-12-31'}T${b.time || '00:00'}`); return dA - dB; }); pendingTasks.forEach((task) => { const oIdx = lead.tasks.findIndex(t => t.id === task.id); if(oIdx !== -1) taskList.appendChild(createTaskItem(task, currentLeadIndex, oIdx)); }); } if (completedTasks.length === 0) { taskHistoryList.innerHTML = '<li class="text-sub text-sm">No hay tareas completadas.</li>'; } else { completedTasks.sort((a, b) => (b.completed || 0) - (a.completed || 0)); completedTasks.forEach((task) => { const oIdx = lead.tasks.findIndex(t => t.id === task.id); if(oIdx !== -1) taskHistoryList.appendChild(createTaskHistoryItem(task, currentLeadIndex, oIdx)); }); } };
    const addTask = () => { if (currentLeadIndex === null || !leads[currentLeadIndex]) { alert("Abre el perfil de un lead para añadir tareas."); return; } const lead = leads[currentLeadIndex]; const date = tDate.value; const time = tTime.value; const type = tType.value; const notes = tNotes.value.trim(); if (!date && !time && !notes) { alert("Selecciona fecha/hora o añade notas para la tarea."); return; } lead.tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).substring(2), type: type, date: date, time: time, notes: notes, done: false, created: Date.now(), completionStatus: null, completionComment: '' }); renderTasks(lead); tDate.value = ''; tTime.value = ''; tNotes.value = ''; updateNotificationBadge(); saveLeadsToStorage(); renderPipeline(); if (addTaskForm && addTaskToggleIcon) { toggleSection(addTaskForm, addTaskToggleIcon); } };
    const handleTaskAction = (e) => { const btn = e.target.closest('button[data-action]'); if (!btn) return; const act = btn.dataset.action; const lIdx = parseInt(btn.dataset.leadIndex, 10); const tIdx = parseInt(btn.dataset.taskIndex, 10); if (isNaN(lIdx) || isNaN(tIdx) || !leads[lIdx] || !leads[lIdx].tasks[tIdx]) { console.error("Invalid index or lead/task data for action:", act, lIdx, tIdx); return; } if (act === 'toggle-task') { const task = leads[lIdx].tasks[tIdx]; if (task.done) { if (confirm("¿Marcar esta tarea como pendiente nuevamente?")) { task.done = false; task.completionStatus = null; task.completed = null; task.completionComment = ''; saveLeadsToStorage(); renderTasks(leads[lIdx]); updateNotificationBadge(); if (!taskListModal.classList.contains('hidden')) { renderTaskListModalContent(); } } } else { openTaskCompletionModal(lIdx, tIdx); } } };

    // --- Comment Functions ---
    const createCommentItem = (cmt) => { const li = document.createElement('li'); li.className = 'text-sm text-sub mb-1 section-border border-b pb-1'; li.innerHTML = `<span class="text-gray-500 dark:text-gray-400 text-xs block">${formatDate(cmt.timestamp)}</span> ${cmt.text}`; return li; };
    const renderComments = (lead) => { if(!commentHistory) return; commentHistory.innerHTML = ''; if (!lead || !lead.comments || lead.comments.length === 0) { commentHistory.innerHTML = '<li class="text-sub text-sm">No hay comentarios aún.</li>'; return; } lead.comments.sort((a, b) => b.timestamp - a.timestamp).forEach(c => commentHistory.appendChild(createCommentItem(c))); commentHistory.scrollTop = 0; };
    const addCommentHandler = () => { if (currentLeadIndex === null || !leads[currentLeadIndex]) return; const lead = leads[currentLeadIndex]; const commentText = mComment.value.trim(); if (!commentText) return; lead.comments.push({ text: commentText, timestamp: Date.now() }); lead.lastComment = commentText; saveLeadsToStorage(); renderComments(lead); renderPipeline(); mComment.value = ''; };

    // --- Lead Card Function ---
    const createCard = (lead, index) => { const column = pipeline.querySelector(`section[data-status="${lead.status}"] .cards`); if (!column) { console.warn(`Columna no encontrada para estado "${lead.status}"`); return; } const hasPendingTasks = lead.tasks && lead.tasks.some(task => !task.done); const card = document.createElement('div'); card.className = `lead-card relative card-bg rounded-md shadow-sm p-4 border section-border transition duration-200 hover:shadow-lg ${hasPendingTasks ? "border-l-4 border-secondary dark:border-dark-secondary" : ""}`; card.dataset.leadIndex = index; const days = Math.max(0, Math.floor((Date.now() - lead.created) / 86400000)); const lastCommentText = lead.lastComment ? `“${lead.lastComment.substring(0, 100)}${lead.lastComment.length > 100 ? '...' : ''}”` : '<em>Sin comentarios recientes</em>'; const pendingTasksCount = lead.tasks.filter(t => !t.done).length; card.innerHTML = `<div class="flex justify-between items-start mb-1"><p class="text-sm text-sub">Antigüedad: ${days} día${days !== 1 ? 's' : ''}</p><div class="flex space-x-1">${Array.from({ length: RATING_MAX }, (_, j) => `<i class="fas fa-star text-sm ${lead.rating > j ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}"></i>`).join('')}</div></div><h3 class="font-semibold text-lg mb-1 text-main">${lead.name || 'Sin Nombre'}</h3><div class="text-sm italic mt-1 mb-2 text-sub min-h-[2.5em]">${lastCommentText}</div><div class="text-sm text-sub mt-2"><strong><i class="fas fa-tag mr-1 text-gray-400 dark:text-gray-500"></i>Interés:</strong> ${lead.interest || 'N/A'}</div><div class="grid grid-cols-2 gap-1 text-sm text-sub border-t section-border pt-2 mt-2"><div><strong><i class="fas fa-phone-alt mr-1 text-gray-400 dark:text-gray-500"></i>Llamadas:</strong> ${lead.calls}</div><div><strong><i class="fas fa-tasks mr-1 ${pendingTasksCount > 0 ? 'text-secondary dark:text-dark-secondary' : 'text-gray-400 dark:text-gray-500'}"></i>Tareas:</strong> ${pendingTasksCount > 0 ? `<span class="font-bold text-secondary dark:text-dark-secondary ml-1">(${pendingTasksCount})</span>` : '0'}</div></div><div class="lead-card-actions hidden absolute top-3 right-3 flex flex-col space-y-2 z-10"><button data-action="call" class="p-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none transition duration-200 shadow-md" title="Registrar Llamada" aria-label="Registrar Llamada"><i class="fas fa-phone"></i></button><button data-action="whatsapp" class="p-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full w-8 h-8 flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-800 focus:outline-none transition duration-200 shadow-md" title="Abrir WhatsApp" aria-label="Abrir WhatsApp"><i class="fab fa-whatsapp"></i></button><button data-action="edit" class="p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none transition duration-200 shadow-md" title="Editar Lead" aria-label="Editar Lead"><i class="fas fa-edit"></i></button></div>`; card.addEventListener('click', (e) => { const leadIdx = parseInt(card.dataset.leadIndex, 10); if (isNaN(leadIdx)) return; const buttonClicked = e.target.closest('button[data-action]'); const currentCardActions = card.querySelector('.lead-card-actions'); if (buttonClicked) { e.stopPropagation(); const action = buttonClicked.dataset.action; hideAllCardActions(); if (action === 'call') { handleCall(leadIdx); } else if (action === 'whatsapp') { handleWhatsApp(leadIdx); } else if (action === 'edit') { openModal(leadIdx); } } else { hideAllCardActions(); if (currentCardActions) { currentCardActions.classList.remove('hidden'); } } }); column.appendChild(card); };

    // --- Pipeline Rendering ---
    const renderPipeline = () => {
        if (!pipeline || !columnTemplate) { console.error("Pipeline or Column Template not found for rendering."); return; }
        pipeline.innerHTML = '';
        statuses.forEach(status => {
            const frag = columnTemplate.content.cloneNode(true);
            const sec = frag.querySelector('section');
            sec.dataset.status = status;
            const h2 = sec.querySelector('h2');
            const count = leads.filter(l => l.status === status).length;
            h2.textContent = `${status} (${count})`;
            pipeline.appendChild(frag);
        });
        const sorted = [...leads].sort((a, b) => b.created - a.created);
        sorted.forEach((lead) => {
            const oIdx = leads.findIndex(l => l.id === lead.id);
            if (oIdx !== -1) createCard(lead, oIdx);
        });
        hideAllCardActions();
    };

    // --- Action Handlers ---
    const handleCall = (index) => { if (index !== null && leads[index]) { const lead = leads[index]; const phone = lead.phone ? lead.phone.replace(/[^0-9+]/g, '') : ''; if (!phone) { alert("Número de teléfono no disponible."); return; } lead.calls = (lead.calls || 0) + 1; try { window.location.href = 'tel:' + phone; } catch (error) { console.warn("No se pudo iniciar la llamada vía tel:", error); } openModal(index); requestAnimationFrame(() => { const cInput = document.getElementById('mComment'); if (cInput) { if (commentsContent?.classList.contains('hidden')) { toggleSection(commentsContent, commentsToggleIcon); } cInput.value = 'Resultado de llamada: '; cInput.focus(); cInput.setSelectionRange(cInput.value.length, cInput.value.length); } }); } };
    const handleWhatsApp = (index) => { if (index !== null && leads[index]) { const lead = leads[index]; const phone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : ''; if (!phone) { alert("Número de teléfono no disponible."); return; } window.open(`https://wa.me/${phone}`, '_blank'); openModal(index); requestAnimationFrame(() => { const cInput = document.getElementById('mComment'); if (cInput) { if (commentsContent?.classList.contains('hidden')) { toggleSection(commentsContent, commentsToggleIcon); } cInput.value = 'Resultado de contacto WhatsApp: '; cInput.focus(); cInput.setSelectionRange(cInput.value.length, cInput.value.length); } }); } };
    const handleEmail = (index) => { if (index !== null && leads[index]) { const lead = leads[index]; const email = lead.email; if (!email) { alert("Correo electrónico no disponible."); return; } window.location.href = `mailto:${email}`; openModal(index); requestAnimationFrame(() => { const cInput = document.getElementById('mComment'); if (cInput) { if (commentsContent?.classList.contains('hidden')) { toggleSection(commentsContent, commentsToggleIcon); } cInput.value = 'Resultado de contacto Email: '; cInput.focus(); cInput.setSelectionRange(cInput.value.length, cInput.value.length); } }); }};

    // --- Dropdown Population ---
    const populateStatusDropdown = () => { if(!mStatus) return; const cur = mStatus.value; mStatus.innerHTML = ''; statuses.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; mStatus.appendChild(o); }); if (statuses.includes(cur)) mStatus.value = cur; };
    const populateInterestDropdown = () => {
        if(!mInterest) return;
        const currentVal = mInterest.value;
        mInterest.innerHTML = ''; // Clear previous options
        // Add the placeholder/disabled option first
        const placeholderOption = document.createElement('option');
        placeholderOption.value = "";
        placeholderOption.textContent = "Selecciona un interés...";
        placeholderOption.disabled = true;
        placeholderOption.hidden = true; // Hide it from the dropdown list itself
        mInterest.appendChild(placeholderOption);
        // Add the actual interest options
        interestOptions.forEach(optionText => {
             if (optionText !== "") { // Skip adding the empty string again
                const option = document.createElement('option');
                option.value = optionText;
                option.textContent = optionText;
                mInterest.appendChild(option);
            }
        });
        // Set the value, defaulting to the placeholder if the previous value isn't valid
        if (interestOptions.includes(currentVal) && currentVal !== "") {
            mInterest.value = currentVal;
        } else {
            mInterest.value = ""; // Ensure placeholder is selected if no valid value
        }
        mInterest.required = true; // Set required after population
    };


    // --- Notifications ---
    const updateNotificationBadge = () => { if(!notificationBadge) return; const todayStr = getTodayDateString(); let tasksTodayCount = 0; leads.forEach(lead => { tasksTodayCount += lead.tasks.filter(task => !task.done && task.date === todayStr).length; }); if (tasksTodayCount > 0) { notificationBadge.textContent = tasksTodayCount > 9 ? '9+' : tasksTodayCount; notificationBadge.classList.remove('hidden'); } else { notificationBadge.classList.add('hidden'); notificationBadge.textContent = '0'; } };

    // --- Google Calendar Link Generation ---
    const generateGoogleCalendarLink = (taskId, leadIndex) => { if (leadIndex === null || !leads[leadIndex] || !leads[leadIndex].tasks) return; const lead = leads[leadIndex]; const task = lead.tasks.find(t => t.id === taskId); if (!task || !task.date || !task.time || !lead.email) { alert("Se requiere tarea con fecha, hora y correo del cliente para GCal."); return; } const startTime = task.time.replace(':', ''); const startDate = task.date.replace(/-/g, ''); const startDateTime = `${startDate}T${startTime}00`; const startHour = parseInt(task.time.substring(0, 2), 10); const endHour = (startHour + 1) % 24; const endHourStr = String(endHour).padStart(2, '0'); const endDateTime = `${startDate}T${endHourStr}${task.time.substring(3)}00`; const details = `Tarea CRM con ${lead.name}.\nInterés: ${lead.interest || 'N/A'}\nNotas: ${task.notes || ''}`; const title = `${task.type}: ${lead.name}`; const url = new URL('https://calendar.google.com/calendar/render'); url.searchParams.set('action', 'TEMPLATE'); url.searchParams.set('text', title); url.searchParams.set('dates', `${startDateTime}/${endDateTime}`); url.searchParams.set('details', details); url.searchParams.set('add', lead.email); window.open(url.toString(), '_blank'); };

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
         console.log("Setting up event listeners...");
         themeToggleButton?.addEventListener('click', toggleDarkMode);
         btnAddLead?.addEventListener('click', () => openModal());
         modalCloseBtn?.addEventListener('click', closeModal);
         btnCancel?.addEventListener('click', closeModal);
         btnAddComment?.addEventListener('click', addCommentHandler);
         btnAddTask?.addEventListener('click', addTask);
         starContainer?.addEventListener('click', handleStarClick);
         taskList?.addEventListener('click', handleTaskAction);
         taskHistoryList?.addEventListener('click', handleTaskAction);
         calendarButton?.addEventListener('click', openTaskListModal);
         taskListModalCloseBtn?.addEventListener('click', closeTaskListModal);
         taskCompletionModalClose?.addEventListener('click', closeTaskCompletionModal);
         taskCompletionCancel?.addEventListener('click', closeTaskCompletionModal);
         taskCompletionSave?.addEventListener('click', saveTaskCompletion);
         btnCallFromModal?.addEventListener('click', () => handleCall(currentLeadIndex));
         btnWhatsAppFromModal?.addEventListener('click', () => handleWhatsApp(currentLeadIndex));
         btnEmailFromModal?.addEventListener('click', () => handleEmail(currentLeadIndex));
         calendarViewContent?.addEventListener('click', (e) => { const openLeadBtn = e.target.closest('button[data-action="open-lead"]'); const gcalBtn = e.target.closest('button[data-action="gcal"]'); if (openLeadBtn) { const lIdx = parseInt(openLeadBtn.dataset.leadIndex, 10); if (!isNaN(lIdx)) { closeTaskListModal(); openModal(lIdx); } } else if (gcalBtn) { const lIdx = parseInt(gcalBtn.dataset.leadIndex, 10); const tId = gcalBtn.dataset.taskId; if (!isNaN(lIdx) && tId) { generateGoogleCalendarLink(tId, lIdx); } } });
         document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!modal?.classList.contains('hidden')) closeModal(); if (!taskListModal?.classList.contains('hidden')) closeTaskListModal(); if (!taskCompletionModal?.classList.contains('hidden')) closeTaskCompletionModal(); } });
         modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
         taskListModal?.addEventListener('click', (e) => { if (e.target === taskListModal) closeTaskListModal(); });
         taskCompletionModal?.addEventListener('click', (e) => { if (e.target === taskCompletionModal) closeTaskCompletionModal(); });
         document.addEventListener('click', (e) => { const clickedCard = e.target.closest('.lead-card'); const isToggleButton = e.target.closest('[id$="-toggle"], .lead-card-actions button'); // Include action buttons in check
            // Hide actions if clicking outside a card OR outside its action buttons
            if (!clickedCard || !clickedCard.contains(e.target)) {
                 hideAllCardActions();
            }
         }, true); // Use capture phase

        // Listeners para secciones colapsables
         commentsToggleBtn?.addEventListener('click', (e) => {e.stopPropagation(); toggleSection(commentsContent, commentsToggleIcon)});
         tasksMainToggleBtn?.addEventListener('click', (e) => {e.stopPropagation(); toggleSection(tasksMainContent, tasksMainToggleIcon)});
         addTaskToggleBtn?.addEventListener('click', (e) => {e.stopPropagation(); toggleSection(addTaskForm, addTaskToggleIcon)});
         // Task History toggle - Note: The HTML structure needs a clickable element wrapping the h4 or the button itself needs an ID. Assuming the h4 is clickable or needs a wrapper with an ID.
         // Let's assume the subsection div itself can be the toggle trigger if needed, or ideally, add an ID to the H4 or its parent div.
         // If 'task-history-subsection' is the clickable area for toggling its content:
         // taskHistoryToggleBtn = document.getElementById('task-history-subsection'); // Example - ADJUST HTML if needed
         // taskHistoryToggleBtn?.addEventListener('click', (e) => {
         //     e.stopPropagation();
         //     // Need to get the actual content div to toggle
         //     const historyContentDiv = taskHistoryToggleBtn.querySelector('.history-bg')?.parentElement; // Find the content
         //     if (historyContentDiv && taskHistoryToggleIcon) {
         //          toggleSection(historyContentDiv, taskHistoryToggleIcon); // Assuming taskHistoryToggleIcon exists and is correct
         //     }
         // });
         // UPDATE: Based on re-reading your HTML, task-history does NOT have its own independent toggle button/icon like the others. It's revealed when 'tasks-main-content' is shown. No extra listener needed here.

         console.log("Event listeners setup complete.");
     };

    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM fully loaded and parsed");
        // Asignar Elementos DOM
        pipeline = document.getElementById('pipeline');
        columnTemplate = document.getElementById('column-template');
        modal = document.getElementById('leadModal');
        modalContent = document.getElementById('lead-modal-content');
        modalCloseBtn = document.getElementById('modalClose');
        btnAddLead = document.getElementById('btnAddLead');
        btnCancel = document.getElementById('btnCancel');
        btnAddTask = document.getElementById('btnAddTask');
        modalTitle = document.getElementById('modalTitle');
        mName = document.getElementById('mName');
        mPhone = document.getElementById('mPhone');
        mEmail = document.getElementById('mEmail');
        mInterest = document.getElementById('mInterest');
        mStatus = document.getElementById('mStatus');
        mComment = document.getElementById('mComment');
        btnAddComment = document.getElementById('btnAddComment');
        commentHistory = document.getElementById('commentHistory');
        starContainer = document.getElementById('starRating');
        taskList = document.getElementById('taskList');
        taskHistoryList = document.getElementById('taskHistoryList');
        tType = document.getElementById('tType');
        tDate = document.getElementById('tDate');
        tTime = document.getElementById('tTime');
        tNotes = document.getElementById('tNotes');
        themeToggleButton = document.getElementById('theme-toggle');
        notificationButton = document.getElementById('notification-button');
        notificationBadge = document.getElementById('notification-badge');
        calendarButton = document.getElementById('calendar-button');
        taskListModal = document.getElementById('taskListModal');
        taskListModalCloseBtn = document.getElementById('taskListModalClose');
        calendarViewContent = document.getElementById('calendar-view-content');
        taskCompletionModal = document.getElementById('taskCompletionModal');
        // Ensure the selector targets the correct div within the taskCompletionModal
        taskCompletionModalContent = taskCompletionModal?.querySelector('.bg-white.dark\\:bg-dark-bg-card');
        taskCompletionModalTitle = document.getElementById('taskCompletionModalTitle');
        taskCompletionModalClose = document.getElementById('taskCompletionModalClose');
        taskCompletionSuccessYes = taskCompletionModal?.querySelector('input[name="taskSuccess"][value="yes"]');
        taskOutcomeComment = document.getElementById('taskOutcomeComment');
        taskCompletionCancel = document.getElementById('taskCompletionCancel');
        taskCompletionSave = document.getElementById('taskCompletionSave');
        darkIcon = document.getElementById('theme-toggle-dark-icon');
        lightIcon = document.getElementById('theme-toggle-light-icon');
        commentsToggleBtn = document.getElementById('comments-toggle');
        commentsContent = document.getElementById('comments-content');
        commentsToggleIcon = document.getElementById('comments-toggle-icon');
        tasksMainToggleBtn = document.getElementById('tasks-main-toggle');
        tasksMainContent = document.getElementById('tasks-main-content');
        tasksMainToggleIcon = document.getElementById('tasks-main-toggle-icon');
        addTaskToggleBtn = document.getElementById('add-task-toggle');
        addTaskForm = document.getElementById('add-task-form');
        addTaskToggleIcon = document.getElementById('add-task-toggle-icon');
        btnCallFromModal = document.getElementById('btnCallFromModal');
        btnWhatsAppFromModal = document.getElementById('btnWhatsAppFromModal');
        btnEmailFromModal = document.getElementById('btnEmailFromModal');
        // Task history elements for toggling (if needed, but likely not based on HTML)
        // taskHistoryContent = document.getElementById('task-history-subsection'); // The whole section
        // taskHistoryToggleIcon = document.getElementById('task-history-toggle-icon'); // Does this ID exist? NO.

        console.log("DOM elements selected.");

        // --- Initial Setup ---
        if (!pipeline || !columnTemplate || !modal || !btnAddLead) {
            console.error("Error crítico: Elementos esenciales del UI no encontrados. Verifica los IDs en el HTML.");
            return; // Detener ejecución si faltan elementos clave
        }
        applyThemePreference(); // Apply theme early
        loadLeadsFromStorage();
        populateStatusDropdown(); // Populate dropdowns before rendering
        populateInterestDropdown();
        renderPipeline();
        updateNotificationBadge();
        setupEventListeners(); // Adjuntar listeners después de seleccionar elementos y cargar datos

        console.log("Initialization complete.");
    });

})(); // End of IIFE