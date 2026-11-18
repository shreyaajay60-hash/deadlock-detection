/**
 * Visualizer Main Controller
 * Orchestrates simulation playback, user controls, sidebar inspectors,
 * modals, and syncs with Renderer and MatrixEditor.
 */

document.addEventListener('DOMContentLoaded', () => {
  const visualizer = new DeadlockVisualizer();
  visualizer.init();
});

class DeadlockVisualizer {
  constructor() {
    this.renderer = new VisualizerRenderer();
    this.matrixEditor = new MatrixEditor((sim, label) => this.loadSimulation(sim, label));

    this.simulation = null;
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.playTimer = null;
    this.playSpeed = 1200; // ms per step

    // DOM Elements
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');
    this.btnNextStep = document.getElementById('btn-next-step');
    this.btnPrevStep = document.getElementById('btn-prev-step');
    this.btnRestart = document.getElementById('btn-restart');
    this.timelineSlider = document.getElementById('timeline-slider');
    this.stepCounterLabel = document.getElementById('step-counter-label');
    this.speedSelect = document.getElementById('speed-select');

    // Narration elements
    this.narrationBanner = document.getElementById('narration-banner');
    this.bannerStepTag = document.getElementById('banner-step-tag');
    this.bannerText = document.getElementById('banner-text');
    this.bannerStatusBadge = document.getElementById('banner-status-badge');

    // Sidebar monitors
    this.workTableHeader = document.getElementById('work-table-header');
    this.workTableValues = document.getElementById('work-table-values');
    this.workTimestamp = document.getElementById('work-timestamp');
    this.finishStatusGrid = document.getElementById('finish-status-grid');
    this.sequenceContainer = document.getElementById('sequence-container');
    this.sequenceCount = document.getElementById('sequence-count');
    this.evalDetailsContent = document.getElementById('eval-details-content');
    this.evalTargetBadge = document.getElementById('eval-target-badge');
    this.logsContainer = document.getElementById('logs-container');

    // Modals
    this.modalTheory = document.getElementById('modal-theory');
    this.btnOpenTheory = document.getElementById('btn-open-theory');
    this.btnCloseTheory = document.getElementById('btn-close-theory');
    this.btnCloseTheoryFooter = document.getElementById('btn-close-theory-footer');

    this.modalResult = document.getElementById('modal-result');
    this.btnCloseResult = document.getElementById('btn-close-result');
    this.btnDismissResult = document.getElementById('btn-dismiss-result');
    this.btnReplayResult = document.getElementById('btn-replay-result');
    this.resultBannerBox = document.getElementById('result-banner-box');
    this.resultHeaderText = document.getElementById('result-header-text');
    this.resultBodyText = document.getElementById('result-body-text');
    this.resultSequenceText = document.getElementById('result-sequence-text');

    this.presetButtons = [
      document.getElementById('btn-preset-1'),
      document.getElementById('btn-preset-2'),
      document.getElementById('btn-preset-3')
    ];
  }

  async init() {
    this.bindEvents();
    // Load default preset (No Deadlock)
    await this.loadPreset('no_deadlock');
  }

  bindEvents() {
    // Playback controls
    this.btnPlayPause.addEventListener('click', () => this.togglePlay());
    this.btnNextStep.addEventListener('click', () => this.nextStep());
    this.btnPrevStep.addEventListener('click', () => this.prevStep());
    this.btnRestart.addEventListener('click', () => this.restart());

    // Timeline slider scrubbing
    this.timelineSlider.addEventListener('input', (e) => {
      this.pause();
      this.goToStep(parseInt(e.target.value, 10));
    });

    // Speed selector
    this.speedSelect.addEventListener('change', (e) => {
      this.playSpeed = parseInt(e.target.value, 10);
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
    });

    // Presets
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        this.presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const presetId = btn.getAttribute('data-preset');
        await this.loadPreset(presetId);
      });
    });

    // Theory modal
    this.btnOpenTheory.addEventListener('click', () => this.modalTheory.classList.add('open'));
    this.btnCloseTheory.addEventListener('click', () => this.modalTheory.classList.remove('open'));
    this.btnCloseTheoryFooter.addEventListener('click', () => this.modalTheory.classList.remove('open'));

    // Theory tabs switching
    const theoryTabBtns = document.querySelectorAll('.theory-tab-btn');
    theoryTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        theoryTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetTabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.theory-tab-pane').forEach(pane => pane.classList.remove('active'));
        const activePane = document.getElementById(targetTabId);
        if (activePane) activePane.classList.add('active');
      });
    });

    // Result modal
    this.btnCloseResult.addEventListener('click', () => this.modalResult.classList.remove('open'));
    this.btnDismissResult.addEventListener('click', () => this.modalResult.classList.remove('open'));
    this.btnReplayResult.addEventListener('click', () => {
      this.modalResult.classList.remove('open');
      this.restart();
      this.play();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if inside an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.nextStep();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.prevStep();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.restart();
      }
    });
  }

  async loadPreset(presetId) {
    this.pause();
    try {
      this.bannerText.textContent = 'Fetching preset scenario...';
      const data = await DeadlockAPI.getExampleTrace(presetId);
      this.loadSimulation(data.simulation, data.example_metadata.title);
    } catch (err) {
      alert(`Could not load preset: ${err.message}`);
    }
  }

  loadSimulation(simulation, title = 'Simulation') {
    this.pause();
    this.simulation = simulation;
    this.currentStepIndex = 0;

    // Setup timeline slider
    const totalSteps = simulation.steps.length;
    this.timelineSlider.min = 0;
    this.timelineSlider.max = totalSteps - 1;
    this.timelineSlider.value = 0;

    // Render static scenario components
    this.renderer.initScenario(simulation);
    this.initSidebarMonitors(simulation);
    this.initLogsList(simulation.steps);

    // Render Step 0
    this.goToStep(0, false);
  }

  initSidebarMonitors(simulation) {
    const m = simulation.num_resources;
    const n = simulation.num_processes;

    // Work Table Headers
    let headerHtml = '';
    let valHtml = '';
    for (let j = 0; j < m; j++) {
      const resName = simulation.resource_names[j] || `R${j}`;
      headerHtml += `<th>${resName}</th>`;
      valHtml += `<td id="work-cell-${j}">0</td>`;
    }
    this.workTableHeader.innerHTML = headerHtml;
    this.workTableValues.innerHTML = valHtml;

    // Finish Grid
    let finishHtml = '';
    for (let i = 0; i < n; i++) {
      const pName = simulation.process_names[i] || `P${i}`;
      finishHtml += `
        <div class="finish-pill" id="finish-pill-${i}">
          <span class="proc-name">${pName}</span>
          <span id="finish-val-${i}">F</span>
        </div>
      `;
    }
    this.finishStatusGrid.innerHTML = finishHtml;
  }

  initLogsList(steps) {
    this.logsContainer.innerHTML = '';
    steps.forEach((step, idx) => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.id = `log-entry-${idx}`;
      entry.innerHTML = `<strong>Step ${idx}:</strong> ${step.title} &mdash; <span style="color:var(--text-muted);">${step.description}</span>`;
      entry.addEventListener('click', () => {
        this.pause();
        this.goToStep(idx);
      });
      this.logsContainer.appendChild(entry);
    });
  }

  goToStep(index, animateParticles = true) {
    if (!this.simulation || !this.simulation.steps) return;
    const steps = this.simulation.steps;
    if (index < 0 || index >= steps.length) return;

    const prevIndex = this.currentStepIndex;
    this.currentStepIndex = index;
    const step = steps[index];

    // Update Slider & Counter
    this.timelineSlider.value = index;
    this.stepCounterLabel.textContent = `Step ${index} / ${steps.length - 1}`;
    this.bannerStepTag.textContent = `Step ${index} / ${steps.length - 1} &bull; ${step.title}`;
    this.bannerText.textContent = step.description;

    // Narration Banner theme styling
    this.narrationBanner.className = 'narration-banner';
    if (step.type === 'PROCESS_EVALUATE') {
      this.narrationBanner.classList.add('evaluating');
      this.bannerStatusBadge.className = 'narration-badge badge-eval';
      this.bannerStatusBadge.textContent = step.can_proceed ? 'Can Proceed ✓' : 'Blocked ⏳';
    } else if (step.type === 'PROCESS_COMPLETE') {
      this.narrationBanner.classList.add('completed');
      this.bannerStatusBadge.className = 'narration-badge badge-pass';
      this.bannerStatusBadge.textContent = 'Released Resources';
    } else if (step.type === 'CONCLUSION') {
      if (step.is_deadlocked) {
        this.narrationBanner.classList.add('deadlocked');
        this.bannerStatusBadge.className = 'narration-badge badge-fail';
        this.bannerStatusBadge.textContent = 'Deadlock Detected';
      } else {
        this.narrationBanner.classList.add('completed');
        this.bannerStatusBadge.className = 'narration-badge badge-pass';
        this.bannerStatusBadge.textContent = 'Safe & Complete';
      }
    } else {
      this.bannerStatusBadge.className = 'narration-badge badge-eval';
      this.bannerStatusBadge.textContent = 'Evaluating';
    }

    // Sidebar Monitors: Work Vector
    if (step.work) {
      this.workTimestamp.textContent = `Step ${index}`;
      step.work.forEach((val, j) => {
        const cell = document.getElementById(`work-cell-${j}`);
        if (cell) {
          cell.textContent = val;
          if (step.resources_released && step.resources_released[j] > 0) {
            cell.classList.add('updated');
            setTimeout(() => cell.classList.remove('updated'), 1000);
          }
        }
      });
    }

    // Sidebar Monitors: Finish Array
    if (step.finish) {
      step.finish.forEach((isDone, i) => {
        const pill = document.getElementById(`finish-pill-${i}`);
        const valSpan = document.getElementById(`finish-val-${i}`);
        if (pill && valSpan) {
          pill.className = 'finish-pill';
          if (isDone) {
            pill.classList.add('finished');
            valSpan.textContent = 'TRUE';
          } else if (step.type === 'CONCLUSION' && step.is_deadlocked && step.deadlocked_indices.includes(i)) {
            pill.classList.add('deadlocked');
            valSpan.textContent = 'DEADLOCK';
          } else {
            valSpan.textContent = 'FALSE';
          }
        }
      });
    }

    // Sidebar Monitors: Completed Sequence
    if (step.completed_sequence) {
      const seq = step.completed_sequence;
      this.sequenceCount.textContent = `${seq.length} completed`;
      if (seq.length === 0) {
        this.sequenceContainer.innerHTML = `<span class="sequence-empty">No processes completed yet</span>`;
      } else {
        let seqHtml = '';
        seq.forEach((pName, k) => {
          seqHtml += `<span class="sequence-badge">${pName}</span>`;
          if (k < seq.length - 1) {
            seqHtml += `<span class="sequence-arrow">&rarr;</span>`;
          }
        });
        this.sequenceContainer.innerHTML = seqHtml;
      }
    }

    // Sidebar Monitors: Evaluation Detail Card
    if (step.type === 'PROCESS_EVALUATE' && step.comparison) {
      this.evalTargetBadge.style.display = 'inline-flex';
      this.evalTargetBadge.textContent = step.process_name;
      let compHtml = `
        <div style="font-weight:700; margin-bottom:0.4rem; color:var(--text-main);">
          Evaluating ${step.process_name}:
        </div>
        <div style="display:flex; flex-direction:column; gap:0.3rem;">
      `;
      step.comparison.forEach(item => {
        compHtml += `
          <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:0.75rem; padding:0.25rem 0.4rem; border-radius:3px; background:${item.satisfied ? '#ecfdf5' : '#fef2f2'}; color:${item.satisfied ? '#065f46' : '#991b1b'};">
            <span>${item.resource}</span>
            <span>Req: ${item.request} ${item.satisfied ? '&le;' : '>'} Work: ${item.work}</span>
            <strong>${item.satisfied ? 'PASS' : 'FAIL'}</strong>
          </div>
        `;
      });
      compHtml += `</div><div style="margin-top:0.4rem; font-size:0.75rem;"><strong>Result:</strong> ${step.can_proceed ? '<span style="color:var(--success-green);">Can proceed and finish</span>' : '<span style="color:var(--danger-red);">Blocked: Work is insufficient</span>'}</div>`;
      this.evalDetailsContent.innerHTML = compHtml;
    } else if (step.type === 'PROCESS_COMPLETE') {
      this.evalTargetBadge.style.display = 'inline-flex';
      this.evalTargetBadge.textContent = step.process_name;
      this.evalDetailsContent.innerHTML = `
        <div style="color:var(--success-green); font-weight:700;">${step.process_name} completed execution!</div>
        <div style="margin-top:0.3rem; font-size:0.75rem;">
          Released allocations back to Work: <code>${JSON.stringify(step.resources_released)}</code>.
        </div>
      `;
    } else if (step.type === 'CONCLUSION') {
      this.evalTargetBadge.style.display = 'none';
      if (step.is_deadlocked) {
        this.evalDetailsContent.innerHTML = `
          <div style="color:var(--danger-red); font-weight:700;">Deadlock Occurred!</div>
          <div style="margin-top:0.3rem; font-size:0.75rem;">
            Unfinished processes: <strong>${step.deadlocked_processes.join(', ')}</strong> cannot proceed.
          </div>
        `;
      } else {
        this.evalDetailsContent.innerHTML = `
          <div style="color:var(--success-green); font-weight:700;">No Deadlock Detected!</div>
          <div style="margin-top:0.3rem; font-size:0.75rem;">
            All processes finished in sequence: <strong>${step.completed_sequence.join(' &rarr; ')}</strong>.
          </div>
        `;
      }
    } else {
      this.evalTargetBadge.style.display = 'none';
      this.evalDetailsContent.innerHTML = `Scanning unfinished processes in pass...`;
    }

    // Highlight active log item and scroll
    const logItems = document.querySelectorAll('.log-entry');
    logItems.forEach(item => item.classList.remove('active'));
    const activeLog = document.getElementById(`log-entry-${index}`);
    if (activeLog) {
      activeLog.classList.add('active');
      activeLog.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Apply state on main workspace
    this.renderer.applyStepState(step, this.simulation);

    // Physical particle animation on process completion (only when moving forward)
    if (animateParticles && index > prevIndex && step.type === 'PROCESS_COMPLETE' && step.flying_tokens) {
      this.renderer.animateFlyingTokens(step.process_index, step.flying_tokens);
    }

    // If final step reached, pop result modal
    if (index === steps.length - 1) {
      this.pause();
      this.showResultModal(step);
    }
  }

  showResultModal(step) {
    if (step.is_deadlocked) {
      this.resultBannerBox.className = 'result-banner deadlock';
      this.resultHeaderText.innerHTML = `<span>🚫</span> Deadlock Detected!`;
      this.resultBodyText.textContent = `The algorithm terminated without all processes finishing. Deadlocked processes: { ${step.deadlocked_processes.join(', ')} }. They are blocked waiting for resources that will never be released.`;
    } else {
      this.resultBannerBox.className = 'result-banner success';
      this.resultHeaderText.innerHTML = `<span>✓</span> No Deadlock! All Processes Can Finish`;
      this.resultBodyText.textContent = `The algorithm successfully found an execution order where every process receives its requested resources, finishes, and releases all held allocations.`;
    }

    this.resultSequenceText.textContent = step.completed_sequence.length > 0
      ? step.completed_sequence.join(' → ')
      : 'None';

    // Show modal after a short delay so user sees canvas state first
    setTimeout(() => {
      this.modalResult.classList.add('open');
    }, 600);
  }

  nextStep() {
    if (!this.simulation) return;
    if (this.currentStepIndex < this.simulation.steps.length - 1) {
      this.goToStep(this.currentStepIndex + 1, true);
    } else {
      this.pause();
    }
  }

  prevStep() {
    if (!this.simulation) return;
    if (this.currentStepIndex > 0) {
      this.goToStep(this.currentStepIndex - 1, false);
    }
  }

  restart() {
    this.pause();
    this.goToStep(0, false);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (!this.simulation) return;
    // If at end, loop back to start
    if (this.currentStepIndex >= this.simulation.steps.length - 1) {
      this.goToStep(0, false);
    }

    this.isPlaying = true;
    this.iconPlay.style.display = 'none';
    this.iconPause.style.display = 'block';

    const stepInterval = () => {
      if (!this.isPlaying) return;
      if (this.currentStepIndex < this.simulation.steps.length - 1) {
        this.nextStep();
        this.playTimer = setTimeout(stepInterval, this.playSpeed);
      } else {
        this.pause();
      }
    };

    this.playTimer = setTimeout(stepInterval, this.playSpeed);
  }

  pause() {
    this.isPlaying = false;
    this.iconPlay.style.display = 'block';
    this.iconPause.style.display = 'none';
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
  }
}
