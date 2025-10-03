// Wrap all code in an IIFE to keep the global scope clean and expose functions via a single object.
const MindCare = (() => {
    // --- Shared Variables ---
    let breathingInterval;
    let planData, completionStatus, daysOfWeek, todayName;
    let goals = []; // Goals data structure

    // --- LOCAL STORAGE KEYS ---
    const LAST_COMPLETION_DATE_KEY = 'streak_lastCompletionDate';
    const STREAK_COUNT_KEY = 'streak_count';
    const SESSIONS_DONE_KEY = 'sessions_total';
    const LAST_STATUS_UPDATE_DATE_KEY = 'plan_lastUpdateDate'; // To reset daily tasks
    // --------------------------

    // --- DOM ELEMENT REFERENCES ---
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const goalList = document.getElementById('goalList');
    const newGoalInput = document.getElementById('newGoalInput');
    const daySelector = document.getElementById('daySelector');
    const planContent = document.getElementById('planContent');
    const breathingText = document.getElementById('breathingText');
    const breathingInstruction = document.getElementById('breathingInstruction');
    
    // NEW: Gratitude Modal Elements
    const gratitudeModal = document.getElementById('gratitudeModal');
    const gratitudeInputContainer = document.getElementById('gratitudeInputContainer');
    const saveGratitudeBtn = document.getElementById('saveGratitudeBtn');
    // ------------------------------

    const aiResponses = [
        "Thank you for sharing. Can you tell me more about that?",
        "I understand. It's okay to feel that way.",
        "That sounds challenging. How have you been coping with it?",
        "I'm here to listen. What's on your mind?",
        "It takes courage to express that. I appreciate you trusting me.",
        "Remember to be kind to yourself. You're doing the best you can."
    ];

    const moodResponses = {
        'Great': { title: "That's wonderful to hear! 😄", text: 'Keep embracing that positive energy! What\'s one thing that made you feel great today?' },
        'Good': { title: "Glad you're feeling good! 😊", text: 'It\'s great to have positive days. Remember this feeling and maybe try a gratitude exercise to enhance it.' },
        'Okay': { title: "Feeling okay is perfectly fine. 😐", text: 'Sometimes a neutral day is a good day. If you want to boost your mood, a short walk or some music might help.' },
        'Not Good': { title: "I'm sorry you're feeling down. 😔", text: 'Remember that feelings are temporary. Would you like to talk about it in the AI chat or try a relaxation exercise?' },
        'Terrible': { title: "I'm here for you. 😢", text: 'It sounds like you\'re having a very tough time. Please be gentle with yourself. If you are in crisis, use the emergency button.' }
    };
    
    // Wellness Plan Data
    planData = {
        monday: { title: "Fresh Start Monday", tasks: [ { icon: '🧘', text: 'Morning meditation', duration: '10 min' }, { icon: '✍', text: 'Gratitude journaling', duration: '5 min' }, { icon: '🤸', text: 'Light yoga or stretching', duration: '15 min' }, { icon: '🫁', text: 'Evening breathing exercises', duration: '5 min' } ] },
        tuesday: { title: "Mindful Movement Tuesday", tasks: [ { icon: '🚶', text: '20-minute walk in nature', duration: '20 min' }, { icon: '🧘', text: 'Body scan meditation', duration: '15 min' }, { icon: '🎨', text: 'Creative expression (art/music)', duration: '20 min' }, { icon: '🤔', text: 'Evening reflection', duration: '5 min' } ] },
        wednesday: { title: "Connection Wednesday", tasks: [ { icon: '📞', text: 'Call a friend or family member', duration: '15 min' }, { icon: '❤', text: 'Loving-kindness meditation', duration: '10 min' }, { icon: '🤝', text: 'Social activity or hobby', duration: '30 min' }, { icon: '🙏', text: 'Gratitude practice', duration: '5 min' } ] },
        thursday: { title: "Active Wellness Thursday", tasks: [ { icon: '💃', text: 'Cardio exercise (dancing, cycling)', duration: '30 min' }, { icon: '💪', text: 'Progressive muscle relaxation', duration: '15 min' }, { icon: '🥗', text: 'Healthy meal prep', duration: '20 min' }, { icon: '😴', text: 'Sleep hygiene routine', duration: '10 min' } ] },
        friday: { title: "Reflective Friday", tasks: [ { icon: '✨', text: 'Morning affirmations', duration: '5 min' }, { icon: '📖', text: 'Weekly journal reflection', duration: '20 min' }, { icon: '☯', text: 'Gentle yoga or tai chi', duration: '20 min' }, { icon: '🎵', text: 'Music therapy session', duration: '15 min' } ] },
        saturday: { title: "Joyful Saturday", tasks: [ { icon: '🌳', text: 'Spend time outdoors', duration: '30 min' }, { icon: '😂', text: 'Watch a funny movie or show', duration: 'Varies' }, { icon: '🕹', text: 'Engage in a favorite hobby', duration: '45 min' }, { icon: '📵', text: 'Digital detox for 1 hour', duration: '60 min' } ] },
        sunday: { title: "Restful Sunday", tasks: [ { icon: '🛌', text: 'Sleep in or take a nap', duration: 'Varies' }, { icon: '🗓', text: 'Plan for the week ahead', duration: '15 min' }, { icon: '🛁', text: 'Take a relaxing bath', duration: '20 min' }, { icon: '😌', text: 'Mindful listening practice', duration: '10 min' } ] }
    };
    daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    todayName = daysOfWeek[new Date().getDay()]; // 0 for Sunday, 1 for Monday...


    // ------------------------------------
    // --- STREAK & DATE UTILITY FUNCTIONS ---
    // ------------------------------------

    /** Gets the current date formatted as YYYY-MM-DD. */
    function getTodayDateString() {
        return new Date().toISOString().slice(0, 10);
    }

    /** Gets yesterday's date formatted as YYYY-MM-DD. */
    function getYesterdayDateString() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().slice(0, 10);
    }

    /** Updates the Streak and Sessions count on the dashboard DOM. */
    function updateDashboardStats() {
        const streakCount = parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0');
        const sessionsDone = parseInt(localStorage.getItem(SESSIONS_DONE_KEY) || '0');

        const streakEl = document.getElementById('streak-days-value');
        const sessionsEl = document.getElementById('sessions-done-value');

        if (streakEl) streakEl.textContent = streakCount;
        if (sessionsEl) sessionsEl.textContent = sessionsDone;
    }

    /**
     * Function called when a user completes any session (e.g., 5-Min Breathing, Mood Log, Task Check).
     * This handles the core logic for streak calculation.
     */
    function completeSession() {
        const todayDateString = getTodayDateString();
        const yesterdayDateString = getYesterdayDateString();

        let lastCompletionDate = localStorage.getItem(LAST_COMPLETION_DATE_KEY);
        let streakCount = parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0');
        let sessionsDone = parseInt(localStorage.getItem(SESSIONS_DONE_KEY) || '0');

        // 1. Update Sessions Done
        sessionsDone++;
        localStorage.setItem(SESSIONS_DONE_KEY, sessionsDone);

        // 2. Check and Update Streak Logic
        if (lastCompletionDate !== todayDateString) {
            // First session completion today, so update the streak status.

            if (lastCompletionDate === yesterdayDateString || lastCompletionDate === null) {
                // Case A: Consecutive day or first-ever session. Increment the streak.
                streakCount++;
            } else {
                // Case B: Streak broken (skipped one or more days). Reset to 1.
                streakCount = 1;
            }

            // Save the new date and streak count
            localStorage.setItem(STREAK_COUNT_KEY, streakCount);
            localStorage.setItem(LAST_COMPLETION_DATE_KEY, todayDateString);
        }

        // 3. Update the HTML
        updateDashboardStats();
    }


    // ------------------------------------
    // --- APP CORE FUNCTIONS ---
    // ------------------------------------

    // Page Navigation
    function showPage(pageId, navButton) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        document.getElementById(pageId).classList.add('active');
        if (navButton) {
            navButton.classList.add('active');
        }
        
        // Specific logic for Workout/Daily Plan page
        if (pageId === 'workout') {
            switchDay(todayName); // Ensure today's plan is shown when navigating to the Daily Plan page
        }
    }

    // Modal Handlers
    function openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }


    // --- Chat Functions ---
    function sendMessage() {
        const messageText = chatInput ? chatInput.value.trim() : '';
        if (messageText === '') return;
        if (!chatMessages || !chatInput) return;

        // Add user message to chat
        const userMessage = document.createElement('div');
        userMessage.classList.add('message', 'user');
        userMessage.textContent = messageText;
        chatMessages.appendChild(userMessage);

        // Clear input and scroll down
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Simulate AI response
        setTimeout(() => {
            const aiMessage = document.createElement('div');
            aiMessage.classList.add('message', 'ai');
            const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
            aiMessage.textContent = randomResponse;
            chatMessages.appendChild(aiMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1500);
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    }


    // --- Mood Tracker Functions ---
    function selectMood(moodButton, mood) {
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
        moodButton.classList.add('selected');

        // Update Mood in Stat Card
        const moodStatEl = document.getElementById('current-mood-value');
        if (moodStatEl) moodStatEl.textContent = mood;

        const responseDiv = document.getElementById('moodResponse');
        if (responseDiv) {
            document.getElementById('moodResponseTitle').textContent = moodResponses[mood].title;
            document.getElementById('moodResponseText').textContent = moodResponses[mood].text;
            responseDiv.style.display = 'block';
        }

        // Count logging a mood as a session completion
        completeSession(); 
    }


    // --- History Filter Function ---
    function filterHistory(category, button) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const historyItems = document.querySelectorAll('.history-item');
        historyItems.forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }


    // --- Breathing Exercise Functions ---
    function startBreathing() {
        if (!breathingText || !breathingInstruction) return;
        openModal('breathingModal');
        const cycleTime = 8000; // 8 seconds, matching the CSS animation

        const updateInstructions = () => {
            breathingText.textContent = "Breathe In";
            breathingInstruction.textContent = "Inhale slowly and deeply (1-2-3-4)";
            setTimeout(() => {
                breathingText.textContent = "Hold";
                breathingInstruction.textContent = "Hold your breath (1-2-3-4-5-6-7)";
            }, 4000); 
            setTimeout(() => {
                breathingText.textContent = "Breathe Out";
                breathingInstruction.textContent = "Exhale completely (1-2-3-4-5-6-7-8)";
            }, 7000); 
        };
            
        updateInstructions(); // Initial run
        breathingInterval = setInterval(updateInstructions, cycleTime);
    }

    function closeBreathingModal(shouldCountSession = false) {
        closeModal('breathingModal');
        clearInterval(breathingInterval);
        if (breathingText) breathingText.textContent = "Get Ready...";
        if (breathingInstruction) breathingInstruction.textContent = "Follow the animation to guide your breath.";

        if (shouldCountSession) {
             completeSession();
        }
    }
    
    // --- PMR Playlist Function ---
    function openPMRPlaylist() {
        const pmrPlaylistUrl = 'https://youtube.com/playlist?list=PLZoDGrriQgsLb5sfR2lldfGcKoQdU_t5S&si=kxuU80KLRXeIK7cH';
        window.open(pmrPlaylistUrl, '_blank');
        completeSession();
    }
    
    // --- Music Therapy Function ---
    function openMusicPlaylist() {
        const musicPlaylistUrl = 'https://www.youtube.com/watch?v=F_Yv28s651k&list=PLrYj8L2vj0V9q4d6x-q4V4F_548M0z9Sg';
        window.open(musicPlaylistUrl, '_blank');
        completeSession();
    }
    
    // --- Meditation Playlist Function ---
    function openMeditationPlaylist() {
        const meditationPlaylistUrl = 'https://www.youtube.com/playlist?list=PLe8n4G3cYFzAzIvEN5vGG_DmNX4OIhRuN';
        window.open(meditationPlaylistUrl, '_blank');
        completeSession(); 
    }
    
    // --- 5-4-3-2-1 Grounding Function ---
    function openGroundingGuide() {
        const groundingUrl = 'https://mentalhealthcenterkids.com/blogs/articles/54321-grounding-technique#:~:text=The%205-4-3-2-1%20method%20uses%20the%20five%20senses%20to,it%20with%20deep%20breathing%2C%20affirmations%2C%20or%20sensory%20tools.';
        window.open(groundingUrl, '_blank');
        completeSession();
    }

    // --- Gratitude Practice Function (NEW INTERACTIVE) ---

    /**
     * Opens the Gratitude Modal and prepares the input fields.
     */
    function startGratitudePractice() {
        if (!gratitudeModal || !gratitudeInputContainer) {
            console.error("Gratitude modal elements not found in DOM. Logging session directly.");
            return completeSession(); 
        }
        
        // Clear and prepare 3 input fields for a clean start
        gratitudeInputContainer.innerHTML = '';
        
        for (let i = 1; i <= 3; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'flex flex-col mb-4';
            
            inputGroup.innerHTML = `
                <label for="gratitude-${i}" class="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Thing ${i}</label>
                <textarea id="gratitude-${i}" rows="2" class="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary transition duration-150 bg-white dark:bg-gray-700 dark:text-white" placeholder="Be specific (e.g., 'The unexpected call from my best friend')"></textarea>
            `;
            gratitudeInputContainer.appendChild(inputGroup);
        }

        // Ensure the save button handler is correctly attached every time
        if (saveGratitudeBtn) {
            // Detach and re-attach to prevent multiple listeners
            saveGratitudeBtn.onclick = null;
            saveGratitudeBtn.onclick = saveGratitudeEntry;
        }

        openModal('gratitudeModal');
    }

    /**
     * Saves the gratitude entries, completes the session, and closes the modal.
     */
    function saveGratitudeEntry() {
        const entries = [];
        const date = new Date();
        
        // Collect data from the 3 text areas
        for (let i = 1; i <= 3; i++) {
            const textarea = document.getElementById(`gratitude-${i}`);
            if (textarea && textarea.value.trim() !== '') {
                entries.push(textarea.value.trim());
            }
        }
        
        if (entries.length < 3) {
            // Use console error instead of alert for better UX within the iframe environment
            console.error('Gratitude Practice failed: Please list at least 3 things you are grateful for.');
            return;
        }

        // 1. Create entry object with timestamp
        const newEntry = {
            date: date.toLocaleDateString(),
            timestamp: date.toLocaleTimeString(),
            gratitudes: entries
        };
        
        // 2. Load existing history and append new entry
        const history = JSON.parse(localStorage.getItem('gratitudeHistory') || '[]');
        history.unshift(newEntry); // Add to the beginning (most recent first)
        localStorage.setItem('gratitudeHistory', JSON.stringify(history));

        // 3. Update Streak & Session Count
        completeSession();

        // 4. Close Modal
        closeModal('gratitudeModal');
    }


    // --- Profile Functions (Goals, Edit) ---
    function toggleEdit(elementId) {
        const container = document.getElementById(`${elementId}-container`);
        const element = document.getElementById(elementId);
        const currentValue = element.textContent;

        if (!container || !element) return;

        if (element.tagName.toLowerCase() === 'span') {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue.replace(/"/g, '');
            input.className = 'editable-input';
            input.id = elementId;
            input.style.fontSize = window.getComputedStyle(element).fontSize;
            input.style.fontWeight = window.getComputedStyle(element).fontWeight;
            
            const saveAndRevert = () => {
                const newValue = input.value.trim();
                const textValue = (elementId === 'profile-status' && newValue) ? `"${newValue}"` : newValue;

                const newSpan = document.createElement('span');
                newSpan.id = elementId;
                newSpan.textContent = textValue || currentValue;

                container.innerHTML = '';
                container.appendChild(newSpan);

                // Reattach edit icon after the span
                const editIcon = document.createElement('span');
                editIcon.className = 'edit-icon';
                editIcon.textContent = '✏';
                editIcon.onclick = () => toggleEdit(elementId);
                // Find the parent's current children to reinsert the icon correctly
                const parent = container.parentNode;
                const existingIcon = parent.querySelector('.edit-icon');
                if (existingIcon) parent.removeChild(existingIcon);
                parent.appendChild(editIcon);

                // Save to localStorage
                localStorage.setItem(`userProfile_${elementId}`, newSpan.textContent);
                
                // Update dashboard name if changed
                if (elementId === 'profile-name') {
                    const firstName = newSpan.textContent.split(' ')[0];
                    const usernameEl = document.getElementById('dashboard-username');
                    if (usernameEl) usernameEl.textContent = firstName;
                    updateDashboardGreetingAndQuote();
                }
            };

            input.addEventListener('keypress', function(e) { if (e.key === 'Enter') { saveAndRevert(); } });
            input.addEventListener('blur', saveAndRevert);

            container.innerHTML = '';
            container.appendChild(input);
            
            // Remove the edit icon temporarily
            const existingIcon = container.parentNode.querySelector('.edit-icon');
            if (existingIcon) existingIcon.remove();
            
            input.focus();
        }
    }

    function selectAvatar(emoji) {
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) avatarEl.textContent = emoji;
        localStorage.setItem('userProfile_avatar', emoji);
        closeModal('avatarModal');
    }

    // Wellness Goals Logic
    function addGoal() {
        const goalText = newGoalInput ? newGoalInput.value.trim() : '';
        if (goalText === '') return;
        
        const goal = { text: goalText, completed: false, id: Date.now() };
        goals.push(goal);
        
        if (newGoalInput) newGoalInput.value = '';
        saveAndRenderGoals();
    }
        
    function saveAndRenderGoals() {
        localStorage.setItem('userProfile_goals', JSON.stringify(goals));
        renderGoals();
    }

    function renderGoals() {
        if (!goalList) return;
        goalList.innerHTML = '';
        goals.forEach(goal => {
            const li = document.createElement('li');
            li.className = `goal-item ${goal.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <input type="checkbox" id="goal-${goal.id}" ${goal.completed ? 'checked' : ''}>
                <label for="goal-${goal.id}">${goal.text}</label>
            `;
            
            li.querySelector('input').addEventListener('change', () => {
                goal.completed = !goal.completed;
                saveAndRenderGoals();
            });
            
            goalList.appendChild(li);
        });
    }

    function loadProfileData() {
        const avatar = localStorage.getItem('userProfile_avatar') || 'A';
        const name = localStorage.getItem('userProfile_name') || 'Alex'; 
        const status = localStorage.getItem('userProfile_status') || '"Striving for balance and peace."';
        goals = JSON.parse(localStorage.getItem('userProfile_goals')) || [
            { text: 'Meditate 3 times this week', completed: false, id: 1 },
            { text: 'Go for a walk today', completed: false, id: 2 }
        ];

        const profileAvatarEl = document.getElementById('profileAvatar');
        if (profileAvatarEl) profileAvatarEl.textContent = avatar;

        const profileNameEl = document.getElementById('profile-name');
        if (profileNameEl) profileNameEl.textContent = name;

        const usernameEl = document.getElementById('dashboard-username');
        if(usernameEl) usernameEl.textContent = name.split(' ')[0];
        
        const profileStatusEl = document.getElementById('profile-status');
        if (profileStatusEl) profileStatusEl.textContent = status;

        // Load Gratitude History (for internal use/future history display)
        const gratitudeHistory = JSON.parse(localStorage.getItem('gratitudeHistory') || '[]');
        if (gratitudeHistory.length > 0) {
            console.log(`Loaded ${gratitudeHistory.length} gratitude entries.`);
        }
        
        renderGoals();
    }


    // --- Dashboard Plan Logic ---
    function updateDashboardGreetingAndQuote() {
        // Dynamic Greeting
        const greetingEl = document.getElementById('dynamic-greeting');
        const usernameEl = document.getElementById('dashboard-username');
        const usernameSpan = usernameEl ? usernameEl.outerHTML : 'Alex';
        const hour = new Date().getHours();
        let greeting = 'Welcome Back, ';
        if (hour < 12) { greeting = 'Good Morning, '; } 
        else if (hour < 18) { greeting = 'Good Afternoon, '; } 
        else { greeting = 'Good Evening, '; }

        if (greetingEl) greetingEl.innerHTML = `${greeting} ${usernameSpan} 👋`;

        // Daily Quote
        const quotes = [
            "The secret of getting ahead is getting started.", "Your limitation—it's only your imagination.", "The best way to get started is to quit talking and begin doing.", "It's not whether you get knocked down, it's whether you get up.", "The only person you are destined to become is the person you decide to be.", "Believe you can and you're halfway there.", "You are never too old to set another goal or to dream a new dream.", "Act as if what you do makes a difference. It does.", "Success is not final, failure is not fatal: it is the courage to continue that counts.", "The journey of a thousand miles begins with a single step."
        ];
        const start = new Date(new Date().getFullYear(), 0, 0);
        const diff = new Date() - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const dailyQuoteEl = document.getElementById('daily-quote');
        if (dailyQuoteEl) dailyQuoteEl.textContent = `"${quotes[dayOfYear % quotes.length]}"`;
        
        // Journal Prompt
        const prompts = [
            "What is one thing you're proud of today?", "Describe a moment that made you smile recently.", "What's one challenge you overcame this week?", "If you could give your past self one piece of advice, what would it be?", "What is something you are looking forward to?", "Write about a person you are grateful for and why.", "What does 'peace' feel like to you right now?", "Describe one thing you can do today to take care of yourself."
        ];
        const journalPromptEl = document.getElementById('journal-prompt');
        if (journalPromptEl) journalPromptEl.textContent = prompts[dayOfYear % prompts.length];
    }

    /**
     * Resets the daily task status if a new day has begun since the last check.
     */
    function resetDailyStatusIfNewDay() {
        const today = getTodayDateString();
        const lastUpdateDate = localStorage.getItem(LAST_STATUS_UPDATE_DATE_KEY);

        if (lastUpdateDate !== today) {
            
            // 1. Reset completion status for all tasks
            const resetCompletionStatus = {};
            daysOfWeek.forEach(day => {
                const taskCount = planData[day].tasks.length;
                resetCompletionStatus[day] = new Array(taskCount).fill(false);
            });
            localStorage.setItem('wellnessPlanStatus', JSON.stringify(resetCompletionStatus));
            
            // 2. Update the last updated date
            localStorage.setItem(LAST_STATUS_UPDATE_DATE_KEY, today);
            
            // 3. Force update of completionStatus variable
            completionStatus = resetCompletionStatus;
            
        } else {
             // Load status from local storage if it's the same day
             completionStatus = JSON.parse(localStorage.getItem('wellnessPlanStatus')) || {};
        }
    }


    function populateDashboardPlan() {
        const planContentEl = document.getElementById('dashboard-plan-content');
        if (!planContentEl || !planData || !todayName || !completionStatus) return;
        
        const dayInfo = planData[todayName];
        const status = completionStatus[todayName] || []; 
        
        const completedCount = status.filter(Boolean).length;
        const totalTasks = dayInfo.tasks.length;
        const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

        const tasksToShow = dayInfo.tasks.slice(0, 3); // Show first 3 tasks
        
        planContentEl.innerHTML = `
            <h3 id="plan-day-title">${dayInfo.title}</h3>
            <div class="progress-container">
                <div class="progress-label">
                    <span>Progress</span>
                    <span id="plan-progress-text">${completedCount} / ${totalTasks}</span>
                </div>
                <div class="progress-bar">
                    <div id="plan-progress-fill" class="progress-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
            <ul class="dashboard-task-list">
                ${tasksToShow.map((task, index) => `
                    <li class="dashboard-task-item ${status[index] ? 'completed' : ''}">
                        <span class="icon">${task.icon}</span>
                        <span>${task.text}</span>
                    </li>
                `).join('')}
                ${totalTasks > 3 ? '<li class="dashboard-task-item"><span>... and more</span></li>' : ''}
            </ul>
        `;
    }


    // --- Daily Plan (Workout) Functions ---
    function generatePlanHTML() {
        if (!daySelector || !planContent) return;

        // Ensure completion status is current
        completionStatus = JSON.parse(localStorage.getItem('wellnessPlanStatus')) || {};

        daySelector.innerHTML = '';
        planContent.innerHTML = '';

        daysOfWeek.forEach(day => { 
            const dayInfo = planData[day];
            
            if (!completionStatus[day] || completionStatus[day].length !== dayInfo.tasks.length) {
                completionStatus[day] = new Array(dayInfo.tasks.length).fill(false);
            }

            // Create day button
            const dayBtn = document.createElement('button');
            dayBtn.className = 'day-btn';
            dayBtn.textContent = day.charAt(0).toUpperCase() + day.slice(1, 3);
            dayBtn.dataset.day = day;
            daySelector.appendChild(dayBtn);

            // Create day plan content
            const dayPlanDiv = document.createElement('div');
            dayPlanDiv.id = `plan-${day}`;
            dayPlanDiv.className = 'day-plan';
            
            const completedCount = completionStatus[day].filter(Boolean).length;
            const totalTasks = dayInfo.tasks.length;
            const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

            dayPlanDiv.innerHTML = `
                <h3>${dayInfo.title}</h3>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Daily Progress</span>
                        <span id="progress-text-${day}">${completedCount} / ${totalTasks} Completed</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" id="progress-fill-${day}" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <ul class="interactive-activity-list">
                    ${dayInfo.tasks.map((task, index) => `
                        <li class="${completionStatus[day][index] ? 'completed' : ''}" data-day="${day}" data-task-index="${index}">
                            <input type="checkbox" class="activity-checkbox" id="task-${day}-${index}" ${completionStatus[day][index] ? 'checked' : ''}>
                            <div class="activity-details">
                                <label for="task-${day}-${index}">
                                    <span class="icon">${task.icon}</span>
                                    ${task.text}
                                </label>
                                <span class="activity-duration">${task.duration}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
            planContent.appendChild(dayPlanDiv);
        });
    }

    function updateProgress(day) {
        const completedCount = completionStatus[day].filter(Boolean).length;
        const totalTasks = planData[day].tasks.length;
        const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

        const fillEl = document.getElementById(`progress-fill-${day}`);
        const textEl = document.getElementById(`progress-text-${day}`);

        if (fillEl) fillEl.style.width = `${percentage}%`;
        if (textEl) textEl.textContent = `${completedCount} / ${totalTasks} Completed`;
    }

    function saveStatus() {
        localStorage.setItem('wellnessPlanStatus', JSON.stringify(completionStatus));
        // Also update dashboard to reflect change
        populateDashboardPlan(); 
    }

    function handleTaskToggle(e) {
        if (e.target.classList.contains('activity-checkbox')) {
            const li = e.target.closest('li');
            const day = li.dataset.day;
            const taskIndex = parseInt(li.dataset.taskIndex, 10);

            completionStatus[day][taskIndex] = e.target.checked;
            li.classList.toggle('completed', e.target.checked);
            
            updateProgress(day);
            saveStatus();

            // Only count as a session for the streak when a task is marked complete
            if (e.target.checked) {
                completeSession();
            }
        }
    }

    function switchDay(day) {
        document.querySelectorAll('.day-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.day === day));
        document.querySelectorAll('.day-plan').forEach(plan => plan.classList.toggle('active', plan.id === `plan-${day}`));
    }
    
    // --- Settings and Theme Functions ---
    function applyInitialTheme() {
        const isDarkMode = localStorage.getItem('theme') === 'dark';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            if(darkModeToggle) darkModeToggle.classList.add('active');
        }
    }
    
    function setupDarkModeToggle() {
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                darkModeToggle.classList.toggle('active');
                document.body.classList.toggle('dark-mode');
                
                if (document.body.classList.contains('dark-mode')) {
                    localStorage.setItem('theme', 'dark');
                } else {
                    localStorage.setItem('theme', 'light');
                }
            });
        }
    }


    // --- Initialization on DOM Load ---
    document.addEventListener('DOMContentLoaded', () => {
        applyInitialTheme();
        setupDarkModeToggle();
        
        // Check and reset daily status if needed
        resetDailyStatusIfNewDay(); 

        // Modal background click handler
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    if(modal.id === 'breathingModal') {
                        closeBreathingModal(false); // No session count on background click
                    } else {
                        closeModal(modal.id);
                    }
                }
            });
        });
        
        // Generic toggle switches
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            if (toggle.id !== 'darkModeToggle') { 
                toggle.addEventListener('click', () => {
                    toggle.classList.toggle('active');
                });
            }
        });

        // Initialize Profile Data and Goals
        loadProfileData();
        if (newGoalInput) {
             newGoalInput.addEventListener('keypress', function(e) {
                 if (e.key === 'Enter') {
                     addGoal();
                 }
             });
        }

        // Initialize Daily Plan/Workout Page Content
        if (daySelector && planContent) {
            generatePlanHTML();
            planContent.addEventListener('change', handleTaskToggle);
            daySelector.addEventListener('click', e => {
                if (e.target.classList.contains('day-btn')) {
                    switchDay(e.target.dataset.day);
                }
            });
            switchDay(todayName); // Show today's plan by default
        }


        // Initialize Dashboard Content
        updateDashboardGreetingAndQuote();
        populateDashboardPlan();
        updateDashboardStats(); // Load initial streak/sessions
    });

    // Public API
    return {
        showPage,
        sendMessage,
        handleKeyPress,
        selectMood,
        filterHistory,
        openModal,
        closeModal,
        startBreathing,
        closeBreathingModal,
        toggleEdit,
        selectAvatar,
        addGoal,
        // Exposed functions for Quick Actions / External Links
        completeSession,
        openPMRPlaylist, 
        openMusicPlaylist, 
        openMeditationPlaylist,
        openGroundingGuide,
        startGratitudePractice // <-- NEW INTERACTIVE START FUNCTION
    };
})();