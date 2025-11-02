document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const algorithmSelect = document.getElementById('algorithm-select');
    const addProcessBtn = document.getElementById('add-process-btn');
    const arrivalInput = document.getElementById('arrival-time');
    const burstInput = document.getElementById('burst-time');
    const priorityInput = document.getElementById('priority-input');
    const quantumInput = document.getElementById('quantum-input');
    const processTableBody = document.getElementById('process-table-body');
    const priorityColHeader = document.getElementById('priority-col-header');
    const runBtn = document.getElementById('run-btn');
    const resetBtn = document.getElementById('reset-btn');
    const outputContainer = document.getElementById('output-container');
    const ganttChart = document.getElementById('gantt-chart');
    const ganttTimeline = document.getElementById('gantt-timeline');
    const metricsTableBody = document.getElementById('metrics-table-body');
    const avgWaitSpan = document.getElementById('avg-wait');
    const avgTurnaroundSpan = document.getElementById('avg-turnaround');
    const avgResponseSpan = document.getElementById('avg-response');
    const cpuUtilSpan = document.getElementById('cpu-util');

    // Info Panel Elements
    const algorithmDescription = document.getElementById("algorithm-description");
    // const timeComplexity = document.getElementById("time-complexity"); // REMOVED

    // --- Global State ---
    let processList = [];
    let pidCounter = 1;
    let selectedAlgorithm = 'fcfs';
    let quantum = 2; // Default for RR
    const colorPalette = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8', '#fd7e14', '#20c997'];

    // Algorithm Info Object - MODIFIED
    const algorithmInfo = {
        fcfs: {
            description: 'First-Come, First-Served is a non-preemptive algorithm. Processes are executed in the exact order they arrive in the ready queue. It is simple but can lead to the "convoy effect".'
            // timeComplexity removed
        },
        sjf: {
            description: 'Shortest Job First is a non-preemptive algorithm that selects the waiting process with the smallest burst time to run next. It is optimal for average waiting time but can starve long jobs.'
            // timeComplexity removed
        },
        ljf: {
            description: 'Largest Job First is a non-preemptive algorithm that selects the waiting process with the largest burst time to run next. It is the opposite of SJF and generally results in poor average waiting time.'
            // timeComplexity removed
        },
        srtf: {
            description: 'Shortest Remaining Time First is the preemptive version of SJF. The scheduler always chooses the process with the shortest remaining time. It can preempt a running process if a new, shorter job arrives.'
            // timeComplexity removed
        },
        priority: {
            description: 'Priority Scheduling is a non-preemptive algorithm where each process has a priority. The process with the highest priority (lowest number) in the ready queue is chosen to run next. Can cause starvation.'
            // timeComplexity removed
        },
        rr: {
            description: 'Round Robin is a preemptive algorithm where each process gets a small unit of CPU time (time quantum). If not finished, it is moved to the end of the ready queue. It is designed for time-sharing systems.'
            // timeComplexity removed
        }
    };


    // --- Event Listeners ---

    // Algorithm Dropdown Selection
    algorithmSelect.addEventListener('change', (e) => {
        selectedAlgorithm = e.target.value; 

        priorityInput.classList.toggle('hidden', selectedAlgorithm !== 'priority');
        quantumInput.classList.toggle('hidden', selectedAlgorithm !== 'rr');
        
        priorityColHeader.classList.toggle('hidden', selectedAlgorithm !== 'priority');
        processTableBody.querySelectorAll('.priority-col').forEach(col => {
            col.classList.toggle('hidden', selectedAlgorithm !== 'priority');
        });

        updateAlgorithmInfo(); // Call update function
    });

    // Add Process
    addProcessBtn.addEventListener('click', () => {
        const arrival = parseInt(arrivalInput.value);
        const burst = parseInt(burstInput.value);
        const priority = parseInt(priorityInput.value) || 0;

        if (isNaN(arrival) || isNaN(burst)) {
            alert('Please enter valid Arrival and Burst times.');
            return;
        }
        if (burst <= 0) {
            alert('Burst time must be greater than 0.');
            return;
        }

        const newProcess = {
            id: `P${pidCounter}`,
            arrival,
            burst,
            priority,
            color: colorPalette[(pidCounter - 1) % colorPalette.length],
        };

        pidCounter++;
        processList.push(newProcess);
        renderProcessTable();
        clearInputs();
    });
    
    // Delete Process (Event Delegation)
    processTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const pid = e.target.dataset.pid;
            processList = processList.filter(p => p.id !== pid);
            renderProcessTable();
        }
    });

    // Run Simulation
    runBtn.addEventListener('click', () => {
        if (processList.length === 0) {
            alert('Please add at least one process.');
            return;
        }

        if (selectedAlgorithm === 'rr') {
            const q = parseInt(quantumInput.value);
            if (isNaN(q) || q <= 0) {
                alert('Please enter a valid Quantum > 0 for Round Robin.');
                return;
            }
            quantum = q;
        }

        runSimulation();
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        processList = [];
        pidCounter = 1;
        clearInputs();
        renderProcessTable();
        outputContainer.classList.add('hidden');
        ganttChart.innerHTML = '';
        ganttTimeline.innerHTML = '';
        metricsTableBody.innerHTML = '';
    });


    // --- UI Functions ---

    // Update Info Panel Function - MODIFIED
    function updateAlgorithmInfo() {
        const info = algorithmInfo[selectedAlgorithm];
        if (!info) return;

        algorithmDescription.innerHTML = `<p>${info.description}</p>`;
        // Time complexity update logic removed
    }

    function renderProcessTable() {
        processTableBody.innerHTML = '';
        processList.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.arrival}</td>
                <td>${p.burst}</td>
                <td class="priority-col ${selectedAlgorithm !== 'priority' ? 'hidden' : ''}">${p.priority}</td>
                <td><div class="color-swatch" style="background-color: ${p.color};"></div></td>
                <td><button class="delete-btn" data-pid="${p.id}">🗑️</button></td>
            `;
            processTableBody.appendChild(row);
        });
    }

    function clearInputs() {
        arrivalInput.value = '';
        burstInput.value = '';
        priorityInput.value = '';
    }

    // --- Simulation Core ---
    function runSimulation() {
        let simProcesses = JSON.parse(JSON.stringify(processList));
        simProcesses.forEach(p => {
            p.remaining = p.burst;
            p.isCompleted = false;
        });

        let currentTime = 0;
        let completedCount = 0;
        const n = simProcesses.length;
        let readyQueue = [];
        let ganttData = [];
        let runningProcess = null;
        let quantumClock = 0;
        let totalCPUTime = 0;
        let completedProcesses = [];

        while (completedCount < n) {
            simProcesses.forEach(p => {
                if (!p.isCompleted && p.arrival === currentTime) {
                    readyQueue.push(p);
                }
            });

            if (runningProcess) {
                if (selectedAlgorithm === 'srtf') {
                    const shortestInQueue = readyQueue.reduce((shortest, p) => 
                        (p.remaining < (shortest ? shortest.remaining : Infinity)) ? p : shortest, null);
                    
                    if (shortestInQueue && shortestInQueue.remaining < runningProcess.remaining) {
                        readyQueue.push(runningProcess);
                        runningProcess = null;
                    }
                }
                else if (selectedAlgorithm === 'rr' && quantumClock === quantum) {
                    readyQueue.push(runningProcess);
                    runningProcess = null;
                }
            }

            if (runningProcess === null && readyQueue.length > 0) {
                switch (selectedAlgorithm) {
                    case 'fcfs':
                        break;
                    case 'sjf':
                        readyQueue.sort((a, b) => a.burst - b.burst);
                        break;
                    case 'ljf':
                        readyQueue.sort((a, b) => b.burst - a.burst);
                        break;
                    case 'priority':
                        readyQueue.sort((a, b) => a.priority - b.priority);
                        break;
                    case 'srtf':
                        readyQueue.sort((a, b) => a.remaining - b.remaining);
                        break;
                    case 'rr':
                        break;
                }
                
                runningProcess = readyQueue.shift();
                quantumClock = 0;

                if (runningProcess.startTime === undefined) {
                    runningProcess.startTime = currentTime;
                }
            }

            if (runningProcess) {
                ganttData.push({ id: runningProcess.id, color: runningProcess.color });
                runningProcess.remaining--;
                quantumClock++;
                totalCPUTime++;

                if (runningProcess.remaining === 0) {
                    runningProcess.completionTime = currentTime + 1;
                    runningProcess.isCompleted = true;
                    completedProcesses.push(runningProcess);
                    completedCount++;
                    runningProcess = null;
                }
            } else {
                ganttData.push({ id: 'IDLE', color: '#555' });
            }

            currentTime++;

            if (currentTime > 10000 && completedCount < n) {
                 console.error("Simulation timeout - check for infinite loops or processes that never arrive.");
                 break;
            }
        }

        calculateAndDisplayMetrics(completedProcesses, totalCPUTime, currentTime - 1);
        renderGanttChart(ganttData);
        outputContainer.classList.remove('hidden');
    }

    function calculateAndDisplayMetrics(completed, totalCPUTime, totalSimTime) {
        let totalWait = 0;
        let totalTurnaround = 0;
        let totalResponse = 0;
        const n = completed.length;

        completed.sort((a, b) => a.id.localeCompare(b.id));
        metricsTableBody.innerHTML = '';

        completed.forEach(p => {
            p.turnaround = p.completionTime - p.arrival;
            p.waiting = p.turnaround - p.burst;
            p.response = p.startTime - p.arrival;

            totalWait += p.waiting;
            totalTurnaround += p.turnaround;
            totalResponse += p.response;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.completionTime}</td>
                <td>${p.turnaround}</td>
                <td>${p.waiting}</td>
                <td>${p.response}</td>
            `;
            metricsTableBody.appendChild(row);
        });

        avgWaitSpan.textContent = (n > 0 ? totalWait / n : 0).toFixed(2);
        avgTurnaroundSpan.textContent = (n > 0 ? totalTurnaround / n : 0).toFixed(2);
        avgResponseSpan.textContent = (n > 0 ? totalResponse / n : 0).toFixed(2);
        const effectiveTime = totalSimTime > 0 ? totalSimTime : 1;
        cpuUtilSpan.textContent = ((totalCPUTime / effectiveTime) * 100).toFixed(2) + '%';
    }

    function renderGanttChart(ganttData) {
        ganttChart.innerHTML = '';
        ganttTimeline.innerHTML = '';
        
        if (ganttData.length === 0) return;

        const compressedGantt = [];
        let lastBlock = { ...ganttData[0], duration: 0 };

        ganttData.forEach(tick => {
            if (tick.id === lastBlock.id) {
                lastBlock.duration++;
            } else {
                compressedGantt.push(lastBlock);
                lastBlock = { ...tick, duration: 1 };
            }
        });
        compressedGantt.push(lastBlock);
        
        const totalDuration = compressedGantt.reduce((sum, block) => sum + block.duration, 0);
        if (totalDuration === 0) return;
        
        let accumulatedTime = 0;

        const timeMarker = document.createElement('div');
        timeMarker.className = 'gantt-time-marker';
        timeMarker.textContent = '0';
        timeMarker.style.flexBasis = '0%';
        ganttTimeline.appendChild(timeMarker);
        
        compressedGantt.forEach(block => {
            const percentageWidth = (block.duration / totalDuration) * 100;

            const blockEl = document.createElement('div');
            blockEl.className = 'gantt-block';
            blockEl.textContent = block.id;
            blockEl.style.backgroundColor = block.color;
            blockEl.style.flexBasis = `${percentageWidth}%`;
            if(block.id === 'IDLE') {
                blockEl.classList.add('idle');
                blockEl.textContent = 'Idle';
            }
            ganttChart.appendChild(blockEl);

            accumulatedTime += block.duration;
            const markerEl = document.createElement('div');
            markerEl.className = 'gantt-time-marker';
            markerEl.textContent = accumulatedTime;
            markerEl.style.flexBasis = `${percentageWidth}%`;
            ganttTimeline.appendChild(markerEl);
        });
    }

    // Initial render
    algorithmSelect.value = 'fcfs';
    algorithmSelect.dispatchEvent(new Event('change')); 
});
