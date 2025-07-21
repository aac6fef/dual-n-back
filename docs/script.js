document.addEventListener('DOMContentLoaded', () => {
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });

    const elementsToAnimate = document.querySelectorAll('.feature-item, .screenshot-gallery figure, .tech-stack ul');
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });

    // Sticky Nav active link highlighting
    const navLinks = document.querySelectorAll('.main-nav a');
    const sections = document.querySelectorAll('main section');

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href.substring(1) === entry.target.id) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });
    }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });

    sections.forEach(section => {
        sectionObserver.observe(section);
    });


    // Modal logic
    const modal = document.getElementById("myModal");
    const modalImg = document.getElementById("img01");
    const galleryImages = document.querySelectorAll(".screenshot-gallery img");
    const closeModal = document.querySelector(".close-modal");

    if (modal && modalImg && galleryImages.length > 0 && closeModal) {
        galleryImages.forEach(img => {
            img.onclick = function(){
                modal.style.display = "flex";
                modalImg.src = this.src;
            }
        });

        const close = () => {
            modal.style.display = "none";
        }

        closeModal.onclick = close;

        modal.onclick = function(event) {
            if (event.target === modal) {
                close();
            }
        }
    }

    // --- Guide Simulator Logic ---
    const visualGrid = document.getElementById('visual-grid');
    if (visualGrid) {
        const audioStimulus = document.getElementById('audio-stimulus');
        const audioNBack = document.getElementById('audio-n-back');
        const nextTrialBtn = document.getElementById('next-trial-btn');
        const resetBtn = document.getElementById('reset-btn');
        const nLevelSelector = document.getElementById('n-level-selector');
        const trialCountSpan = document.getElementById('trial-count');
        const explanationDiv = document.getElementById('explanation');
        const guideNavController = document.querySelector('.guide-header');

        let gridCells = [];
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i;
            visualGrid.appendChild(cell);
            gridCells.push(cell);
        }

        const audioChars = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];
        let state = {
            nLevel: 2,
            trialIndex: 0,
            history: [], // { visual: number, audio: string }
            isTutorialMatchScheduled: true,
        };

        function updateNSelectorUI() {
            nLevelSelector.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.n) === state.nLevel);
            });
        }

        function resetSimulation() {
            state.trialIndex = 0;
            state.history = [];
            state.isTutorialMatchScheduled = true;
            trialCountSpan.textContent = 0;
            audioStimulus.textContent = '-';
            audioNBack.textContent = '-';
            gridCells.forEach(cell => cell.className = 'grid-cell');
            const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
            explanationDiv.innerHTML = lang === 'zh' 
                ? '已重置。点击“下一步”开始教学演示。'
                : 'Reset. Click "Next Step" to begin the tutorial demonstration.';
            explanationDiv.className = 'explanation-box info';
        }

        function runNextTrial() {
            state.trialIndex++;
            trialCountSpan.textContent = state.trialIndex;

            gridCells.forEach(cell => cell.className = 'grid-cell');

            let visualStimulus, audioStimulusChar;
            let isTutorialMatch = false;

            if (state.isTutorialMatchScheduled && state.trialIndex === state.nLevel + 1) {
                const targetStimulus = state.history[0];
                visualStimulus = targetStimulus.visual;
                audioStimulusChar = targetStimulus.audio;
                isTutorialMatch = true;
                state.isTutorialMatchScheduled = false;
            } else {
                visualStimulus = Math.floor(Math.random() * 9);
                audioStimulusChar = audioChars[Math.floor(Math.random() * audioChars.length)];
            }
            
            state.history.push({ visual: visualStimulus, audio: audioStimulusChar });
            
            gridCells[visualStimulus].classList.add('current-stimulus');
            audioStimulus.textContent = audioStimulusChar;
            
            const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
            let explanationText, matchText;

            if (lang === 'zh') {
                explanationText = `第 ${state.trialIndex} 轮：<br>当前位置: ${visualStimulus + 1}号格, 当前字母: '${audioStimulusChar}'`;
            } else {
                explanationText = `Trial ${state.trialIndex}:<br>Current Position: Grid ${visualStimulus + 1}, Current Letter: '${audioStimulusChar}'`;
            }

            let visualMatch = false;
            let audioMatch = false;

            if (state.trialIndex > state.nLevel) {
                const nBackIndex = state.trialIndex - 1 - state.nLevel;
                const nBackStimulus = state.history[nBackIndex];
                
                audioNBack.textContent = nBackStimulus.audio;
                gridCells[nBackStimulus.visual].classList.add('n-back-match');
                
                if (nBackStimulus.visual === visualStimulus) visualMatch = true;
                if (nBackStimulus.audio === audioStimulusChar) audioMatch = true;
                
                if (lang === 'zh') {
                    explanationText += `<br>N=${state.nLevel}步前位置: ${nBackStimulus.visual + 1}号格, 字母: '${nBackStimulus.audio}'`;
                } else {
                    explanationText += `<br>N=${state.nLevel} steps back: Position ${nBackStimulus.visual + 1}, Letter: '${nBackStimulus.audio}'`;
                }
            } else {
                audioNBack.textContent = '-';
                if (lang === 'zh') {
                    explanationText += `<br>正在记录历史...还需要 ${state.nLevel - state.trialIndex + 1} 轮才能开始判断。`;
                } else {
                    explanationText += `<br>Recording history... ${state.nLevel - state.trialIndex + 1} more trials until matching begins.`;
                }
            }

            if (isTutorialMatch) {
                explanationDiv.className = 'explanation-box success';
                if (lang === 'zh') {
                    explanationText += `<br><strong class="font-bold">教学时刻：这是一个双重匹配！</strong><br>请注意，当前刺激（位置和字母）与${state.nLevel}步前的完全相同。在真实游戏中，您需要同时按下视觉和听觉的匹配按钮。`;
                } else {
                    explanationText += `<br><strong class="font-bold">Teaching Moment: This is a dual match!</strong><br>Notice the current stimulus (position and letter) is identical to the one from ${state.nLevel} steps ago. In a real game, you would press both the visual and audio match keys.`;
                }
            } else if (visualMatch || audioMatch) {
                explanationDiv.className = 'explanation-box success';
                if (lang === 'zh') {
                    matchText = [];
                    if (visualMatch) matchText.push("视觉匹配");
                    if (audioMatch) matchText.push("听觉匹配");
                    explanationText += `<br><strong class="font-bold">出现${matchText.join('和')}！</strong>`;
                } else {
                    matchText = [];
                    if (visualMatch) matchText.push("Visual Match");
                    if (audioMatch) matchText.push("Audio Match");
                    explanationText += `<br><strong class="font-bold">${matchText.join(' and ')}!</strong>`;
                }
            } else {
                explanationDiv.className = 'explanation-box info';
                if (state.trialIndex > state.nLevel) {
                    if (lang === 'zh') {
                        explanationText += "<br>均不匹配。";
                    } else {
                        explanationText += "<br>No match.";
                    }
                }
            }
            
            explanationDiv.innerHTML = explanationText;
        }

        nLevelSelector.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                state.nLevel = parseInt(e.target.dataset.n);
                updateNSelectorUI();
                resetSimulation();
            }
        });
        
        nextTrialBtn.addEventListener('click', runNextTrial);
        resetBtn.addEventListener('click', resetSimulation);
        
        const guideSections = document.querySelectorAll('.guide-container section');
        const guideNavLinks = document.querySelectorAll('.guide-header .nav-link');

        const guideObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    guideNavLinks.forEach(link => {
                        const isActive = link.getAttribute('href').substring(1) === entry.target.id;
                        link.classList.toggle('active', isActive);
                    });
                }
            });
        }, { rootMargin: "-40% 0px -60% 0px", threshold: 0 });

        guideSections.forEach(section => guideObserver.observe(section));

        // Sticky guide nav logic
        const guideNavObserver = new IntersectionObserver(
            ([e]) => e.target.classList.toggle('is-pinned', e.intersectionRatio < 1),
            {threshold: [1]}
        );
        if(guideNavController) guideNavObserver.observe(guideNavController);

        updateNSelectorUI();
        resetSimulation();
    }
});

// Add a simple animation style to the head
const style = document.createElement('style');
style.innerHTML = `
    .feature-item, .screenshot-gallery figure, .tech-stack ul {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    }

    .feature-item.visible, .screenshot-gallery figure.visible, .tech-stack ul.visible {
        opacity: 1;
        transform: translateY(0);
    }

    .guide-header {
        transition: top 0.3s;
        top: -100px; /* Start hidden */
    }

    .guide-header.is-pinned {
        top: 0;
    }
`;
document.head.appendChild(style);
