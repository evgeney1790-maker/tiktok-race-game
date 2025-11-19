// --- Wait for whole page to load before running script ---
window.addEventListener('load', () => {
    console.log("Page and assets loaded. Initializing game...");

    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    const mainScreen = document.getElementById('main-screen');
    const countdownScreen = document.getElementById('countdown-screen');
    const raceScreen = document.getElementById('race-screen');
    const resultsScreen = document.getElementById('results-screen');
    const timerDisplay = document.getElementById('timer');
    const countdownNumber = document.getElementById('countdown-number');
    const participantsCount = mainScreen.querySelector('.participants-count');
    const runners = document.querySelectorAll('.runner');
    const playerNameSpans = document.querySelectorAll('.player-name');
    const raceTrack = document.getElementById('race-track');

    let raceIntervals = [];
    let timerInterval;
    let isRaceActive = false;
    let timeLeft = 35;
    let runnerBaseSpeeds = [0, 0, 0, 0];
    let finishLine = 0;
    let audioUnlocked = false;

    // --- Audio Unlock ---
    document.body.addEventListener('click', () => {
        if (!audioUnlocked) {
            audioUnlocked = true;
            console.log("Audio unlocked by user interaction.");
        }
    }, { once: true });

    function speak(text) {
        if (!audioUnlocked) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google US English Male')) ||
                           voices.find(v => v.lang.startsWith('en') && v.name.includes('Male')) ||
                           voices.find(v => v.lang.startsWith('en-US'));
        if (selectedVoice) { utterance.voice = selectedVoice; }
        window.speechSynthesis.speak(utterance);
    }
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => { speechSynthesis.getVoices(); };
    }

    function showScreen(screenToShow) {
        [mainScreen, countdownScreen, raceScreen, resultsScreen].forEach(s => s.classList.add('hidden'));
        screenToShow.classList.remove('hidden');
    }

    function startCountdown(playerData) {
        console.log("Starting countdown with players:", playerData);
        isRaceActive = true;
        showScreen(countdownScreen);
        let count = 3;
        countdownNumber.textContent = count;
        const countInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
                countdownNumber.style.animation = 'none';
                setTimeout(() => countdownNumber.style.animation = 'countdownPulse 1s ease-in-out', 10);
            } else if (count === 0) {
                countdownNumber.textContent = 'GO!';
            } else {
                clearInterval(countInterval);
                startRace(playerData);
            }
        }, 1000);
    }

    function startRace(playerData) {
        showScreen(raceScreen);
        playerData.forEach((data, index) => {
            playerNameSpans[index].textContent = data.name;
            runners[index].querySelector('img').src = data.avatar;
        });
        runners.forEach(r => r.style.left = '5px');
        runnerBaseSpeeds = runnerBaseSpeeds.map(() => 0.8 + Math.random() * 0.8);
        const trackWidth = raceTrack.offsetWidth;
        finishLine = trackWidth - 60;
        timeLeft = 35;
        timerDisplay.textContent = timeLeft;
        runners.forEach((runner, index) => {
            const interval = setInterval(() => {
                if (!isRaceActive) return;
                const currentLeft = parseInt(runner.style.left) || 5;
                const randomBoost = (Math.random() - 0.5) * 1.2;
                const currentSpeed = runnerBaseSpeeds[index] + randomBoost;
                const finalSpeed = Math.max(0.4, currentSpeed);
                const newLeft = Math.min(currentLeft + finalSpeed, finishLine);
                runner.style.left = newLeft + 'px';
            }, 100);
            raceIntervals.push(interval);
        });
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endRace();
            }
        }, 1000);
    }

    function endRace() {
        console.log("Race ended.");
        isRaceActive = false;
        raceIntervals.forEach(i => clearInterval(i));
        raceIntervals = [];
        const finishedRunners = [];
        runners.forEach((runner, index) => {
            const name = playerNameSpans[index].textContent;
            const position = parseInt(runner.style.left) || 0;
            if (position >= finishLine) { finishedRunners.push({ name, position }); }
        });
        finishedRunners.sort((a, b) => b.position - a.position);
        showResults(finishedRunners);
    }

    function showResults(results) {
        console.log("Showing results:", results);
        showScreen(resultsScreen);
        if (results.length >= 1) {
            document.getElementById('first-place-name').textContent = results[0].name;
        } else {
            document.getElementById('first-place-name').textContent = "---";
        }
        if (results.length >= 2) {
            document.getElementById('second-place-name').textContent = results[1].name;
        } else {
            document.getElementById('second-place-name').textContent = "---";
        }
        if (results.length >= 3) {
            document.getElementById('third-place-name').textContent = results[2].name;
        } else {
            document.getElementById('third-place-name').textContent = "---";
        }
        if (results.length > 0) {
            const congratulation = `Congratulations! The winner is ${results[0].name}! Hooray!`;
            setTimeout(() => speak(congratulation), 1000);
        }
        setTimeout(() => {
            isRaceActive = false;
            showScreen(mainScreen);
            participantsCount.textContent = 'Waiting for participants...';
        }, 7000);
    }

    // --- Main Automation Function for Streamlabs ---
    function checkForParticipants() {
        if (isRaceActive) return;

        // Check if $store object exists
        if (typeof $store === 'undefined') {
            console.error("FATAL ERROR: $store object is not defined. This script must be run in Streamlabs.");
            participantsCount.textContent = "Error: Not connected to Streamlabs.";
            return;
        }

        // Read names from Streamlabs variables
        const player1Data = $store.get('race_player1');
        const player2Data = $store.get('race_player2');
        const player3Data = $store.get('race_player3');
        const player4Data = $store.get('race_player4');

        console.log("SE Data:", { p1: player1Data, p2: player2Data, p3: player3Data, p4: player4Data });

        if (player1Data && player2Data && player3Data && player4Data) {
            let player1 = { name: '', avatar: 'https://i.pravatar.cc/150?img=5' };
            if (player1Data) { const parts = player1Data.split('|'); if (parts.length >= 1) player1.name = parts[0]; if (parts.length >= 2) player1.avatar = parts[1]; }
            let player2 = { name: '', avatar: 'https://i.pravatar.cc/150?img=5' }; if (player2Data) { const parts = player2Data.split('|'); if (parts.length >= 1) player2.name = parts[0]; if (parts.length >= 2) player2.avatar = parts[1]; }
            let player3 = { name: '', avatar: 'https://i.pravatar.cc/150?img=5' }; if (player3Data) { const parts = player3Data.split('|'); if (parts.length >= 1) player3.name = parts[0]; if (parts.length >= 2) player3.avatar = parts[1]; }
            let player4 = { name: '', avatar: 'https://i.pravatar.cc/150?img=5' }; if (player4Data) { const parts = player4Data.split('|'); if (parts.length >= 1) player4.name = parts[0]; if (parts.length >= 2) player4.avatar = parts[1]; }

            const playerDataArray = [player1, player2, player3, player4];

            // Clear variables in Streamlabs for next race
            $store.set('race_player1', '');
            $store.set('race_player2', '');
            $store.set('race_player3', '');
            $store.set('race_player4', '');

            startCountdown(playerDataArray);
        } else {
            const currentCount = [player1Data, player2Data, player3Data, player4Data].filter(p => p).length;
            participantsCount.textContent = `Players joined: ${currentCount}/4`;
        }
    }

    // Start participant check loop
    setInterval(checkForParticipants, 1000);

    // --- Hide loading screen and show game ---
    loadingScreen.style.display = 'none';
    gameContainer.style.display = 'flex';
    showScreen(mainScreen);
});
