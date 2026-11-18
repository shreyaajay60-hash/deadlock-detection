/**
 * Renderer for Deadlock Detection Visualizer
 * Manages rendering of Available Resource Pools, Process Cards, Dynamic SVG Arrows,
 * and Physical Flying Particle Token Animations.
 */

class VisualizerRenderer {
  constructor() {
    this.resourceColors = ['res-0', 'res-1', 'res-2', 'res-3', 'res-4'];
    this.resourceHexes = ['#059669', '#4f46e5', '#d97706', '#7c3aed', '#e11d48'];
    this.particlesLayer = document.getElementById('flying-particles-layer');
    this.svgGroup = document.getElementById('svg-arrows-group');
    this.canvasWrapper = document.getElementById('simulation-canvas-wrapper');
    this.svgLayer = document.getElementById('svg-connections-layer');
    
    // Bind resize to refresh arrows
    window.addEventListener('resize', () => {
      this.refreshArrows();
    });
  }

  /**
   * Initializes the base layout for a simulation scenario
   */
  initScenario(simulation) {
    this.simulation = simulation;
    this.renderAvailablePools(simulation.initial_available, simulation.resource_names);
    this.renderProcessCards(simulation);
    // Give DOM a frame to compute positions before drawing arrows
    requestAnimationFrame(() => {
      this.refreshArrows();
    });
  }

  /**
   * Renders the Available Resources / Work Vector Pools at the top
   */
  renderAvailablePools(availableVector, resourceNames) {
    const grid = document.getElementById('resource-pools-grid');
    grid.innerHTML = '';

    availableVector.forEach((count, j) => {
      const resName = resourceNames[j] || `R${j}`;
      const colorClass = this.resourceColors[j % this.resourceColors.length];

      const poolBox = document.createElement('div');
      poolBox.className = `resource-pool-box`;
      poolBox.id = `resource-pool-${j}`;
      poolBox.style.borderColor = this.resourceHexes[j % this.resourceHexes.length];

      // Generate initial token chips
      let tokensHtml = '';
      if (count > 0) {
        for (let k = 0; k < Math.min(count, 12); k++) {
          tokensHtml += `<span class="token-chip ${colorClass}"></span>`;
        }
        if (count > 12) {
          tokensHtml += `<span style="font-size:0.7rem; color:var(--text-dim);">+${count - 12}</span>`;
        }
      } else {
        tokensHtml = `<span class="empty-tokens-label">0 available</span>`;
      }

      poolBox.innerHTML = `
        <div class="pool-header">
          <span class="res-pill ${colorClass}">
            <strong>${resName}</strong>
          </span>
          <span class="pool-count" id="pool-count-${j}">${count}</span>
        </div>
        <div class="pool-tokens-container" id="pool-tokens-${j}">
          ${tokensHtml}
        </div>
      `;

      grid.appendChild(poolBox);
    });
  }

  /**
   * Updates Available / Work counts and visual token chips
   */
  updateAvailablePools(workVector, highlightIndices = []) {
    workVector.forEach((count, j) => {
      const countEl = document.getElementById(`pool-count-${j}`);
      const tokensEl = document.getElementById(`pool-tokens-${j}`);
      const poolBox = document.getElementById(`resource-pool-${j}`);

      if (countEl) {
        const prevCount = parseInt(countEl.textContent, 10);
        countEl.textContent = count;
        
        if (highlightIndices.includes(j) && count > prevCount) {
          poolBox.classList.add('highlight-gain');
          setTimeout(() => poolBox.classList.remove('highlight-gain'), 800);
        }
      }

      if (tokensEl) {
        const colorClass = this.resourceColors[j % this.resourceColors.length];
        let tokensHtml = '';
        if (count > 0) {
          for (let k = 0; k < Math.min(count, 12); k++) {
            tokensHtml += `<span class="token-chip ${colorClass}"></span>`;
          }
          if (count > 12) {
            tokensHtml += `<span style="font-size:0.7rem; color:var(--text-dim);">+${count - 12}</span>`;
          }
        } else {
          tokensHtml = `<span class="empty-tokens-label">0 available</span>`;
        }
        tokensEl.innerHTML = tokensHtml;
      }
    });
  }

  /**
   * Renders the process cards
   */
  renderProcessCards(simulation) {
    const grid = document.getElementById('process-cards-grid');
    grid.innerHTML = '';

    const n = simulation.num_processes;
    const m = simulation.num_resources;

    for (let i = 0; i < n; i++) {
      const pName = simulation.process_names[i] || `P${i}`;
      const allocRow = simulation.allocation[i];
      const reqRow = simulation.request[i];

      const card = document.createElement('div');
      card.className = 'process-card';
      card.id = `process-card-${i}`;

      // Build allocated chips
      let allocChipsHtml = '';
      let totalAlloc = 0;
      for (let j = 0; j < m; j++) {
        const count = allocRow[j];
        totalAlloc += count;
        const colorClass = this.resourceColors[j % this.resourceColors.length];
        const resLabel = simulation.resource_names[j] || `R${j}`;
        allocChipsHtml += `
          <span class="resource-chip-tag ${count === 0 ? 'zero' : colorClass}">
            ${resLabel}: ${count}
          </span>
        `;
      }

      // Build requested chips
      let reqChipsHtml = '';
      let totalReq = 0;
      for (let j = 0; j < m; j++) {
        const count = reqRow[j];
        totalReq += count;
        const colorClass = this.resourceColors[j % this.resourceColors.length];
        const resLabel = simulation.resource_names[j] || `R${j}`;
        reqChipsHtml += `
          <span class="resource-chip-tag ${count === 0 ? 'zero' : colorClass}">
            ${resLabel}: ${count}
          </span>
        `;
      }

      card.innerHTML = `
        <div class="card-header-row">
          <div class="process-id-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
            ${pName}
          </div>
          <span class="process-status-pill status-waiting" id="card-status-${i}">Waiting</span>
        </div>

        <div class="resource-matrix-mini">
          <div class="matrix-row">
            <div class="matrix-row-title">
              <span>Holds (Allocation)</span>
              <span class="count-summary" id="alloc-total-${i}">Total: ${totalAlloc}</span>
            </div>
            <div class="resource-chips-flex" id="card-alloc-chips-${i}">
              ${allocChipsHtml}
            </div>
          </div>

          <div class="matrix-row" style="margin-top: 0.2rem;">
            <div class="matrix-row-title">
              <span>Needs (Request)</span>
              <span class="count-summary">Total: ${totalReq}</span>
            </div>
            <div class="resource-chips-flex">
              ${reqChipsHtml}
            </div>
          </div>
        </div>

        <!-- Dynamic evaluation comparison container -->
        <div class="eval-comparison-box" id="card-comparison-${i}" style="display: none;"></div>
      `;

      grid.appendChild(card);
    }
  }

  /**
   * Applies step state to all cards and visual elements
   */
  applyStepState(step, simulation) {
    const n = simulation.num_processes;

    // Reset all card states to base (finished or waiting)
    for (let i = 0; i < n; i++) {
      const card = document.getElementById(`process-card-${i}`);
      const statusPill = document.getElementById(`card-status-${i}`);
      const compBox = document.getElementById(`card-comparison-${i}`);

      if (!card) continue;

      card.classList.remove('state-evaluating', 'state-completed', 'state-deadlocked');
      compBox.style.display = 'none';
      compBox.innerHTML = '';

      if (step.finish && step.finish[i]) {
        card.classList.add('state-completed');
        statusPill.className = 'process-status-pill status-completed';
        statusPill.textContent = 'Completed ✓';
      } else {
        statusPill.className = 'process-status-pill status-waiting';
        statusPill.textContent = 'Waiting';
      }
    }

    // Handle active evaluation
    if (step.type === 'PROCESS_EVALUATE' && step.process_index !== null) {
      const idx = step.process_index;
      const card = document.getElementById(`process-card-${idx}`);
      const statusPill = document.getElementById(`card-status-${idx}`);
      const compBox = document.getElementById(`card-comparison-${idx}`);

      if (card) {
        card.classList.add('state-evaluating');
        statusPill.className = 'process-status-pill status-evaluating';
        statusPill.textContent = step.can_proceed ? 'Can Finish ✓' : 'Blocked ⏳';

        // Render comparison checklist inside card
        if (step.comparison) {
          compBox.style.display = 'flex';
          let compHtml = `<div class="eval-comp-title">Condition: Request[i] &le; Work</div>`;
          step.comparison.forEach(item => {
            const pass = item.satisfied;
            compHtml += `
              <div class="comp-item-row ${pass ? 'pass' : 'fail'}">
                <span>${item.resource}</span>
                <span>Req: ${item.request} ${pass ? '&le;' : '>'} Work: ${item.work}</span>
                <span>${pass ? '✓' : '✗'}</span>
              </div>
            `;
          });
          compBox.innerHTML = compHtml;
        }
      }
    }

    // Handle completed process step
    if (step.type === 'PROCESS_COMPLETE' && step.process_index !== null) {
      const idx = step.process_index;
      const card = document.getElementById(`process-card-${idx}`);
      const statusPill = document.getElementById(`card-status-${idx}`);
      if (card) {
        card.classList.add('state-completed');
        statusPill.className = 'process-status-pill status-completed';
        statusPill.textContent = 'Completed ✓';
      }
    }

    // Handle Deadlock Conclusion
    if (step.type === 'CONCLUSION' && step.is_deadlocked) {
      step.deadlocked_indices.forEach(idx => {
        const card = document.getElementById(`process-card-${idx}`);
        const statusPill = document.getElementById(`card-status-${idx}`);
        if (card) {
          card.classList.add('state-deadlocked');
          statusPill.className = 'process-status-pill status-deadlocked';
          statusPill.textContent = 'Deadlocked 🚫';
        }
      });
    }

    // Update Available pool counts
    const gainIndices = [];
    if (step.type === 'PROCESS_COMPLETE' && step.resources_released) {
      step.resources_released.forEach((val, j) => {
        if (val > 0) gainIndices.push(j);
      });
    }
    this.updateAvailablePools(step.work, gainIndices);

    // Refresh connecting SVG lines
    this.refreshArrows(step);
  }

  /**
   * Refreshes dynamic SVG lines connecting Process Cards and Available Resource Pools
   */
  refreshArrows(currentStep = null) {
    if (!this.simulation || !this.svgGroup || !this.canvasWrapper) return;

    this.svgGroup.innerHTML = '';
    const wrapperRect = this.canvasWrapper.getBoundingClientRect();
    const n = this.simulation.num_processes;
    const m = this.simulation.num_resources;

    // Check if deadlocked in current step
    const isDeadlockedStep = currentStep && currentStep.type === 'CONCLUSION' && currentStep.is_deadlocked;
    const deadlockedIndices = isDeadlockedStep ? (currentStep.deadlocked_indices || []) : [];

    for (let i = 0; i < n; i++) {
      const card = document.getElementById(`process-card-${i}`);
      if (!card) continue;

      const cardRect = card.getBoundingClientRect();
      const isFinished = currentStep && currentStep.finish && currentStep.finish[i];
      const isEvaluating = currentStep && currentStep.type === 'PROCESS_EVALUATE' && currentStep.process_index === i;
      const isDeadlocked = deadlockedIndices.includes(i);

      for (let j = 0; j < m; j++) {
        const allocCount = this.simulation.allocation[i][j];
        const reqCount = this.simulation.request[i][j];
        const pool = document.getElementById(`resource-pool-${j}`);
        if (!pool) continue;

        const poolRect = pool.getBoundingClientRect();

        // 1. Solid Green Allocation Arrow (Pool -> Process Card)
        // Only show if process holds resource and has not finished
        if (allocCount > 0 && !isFinished) {
          const startX = (poolRect.left + poolRect.width / 2) - wrapperRect.left;
          const startY = (poolRect.bottom) - wrapperRect.top;
          const endX = (cardRect.left + (cardRect.width * (0.2 + (j * 0.15)))) - wrapperRect.left;
          const endY = (cardRect.top) - wrapperRect.top;

          const pathD = this.computeCurve(startX, startY, endX, endY);
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathD);
          path.setAttribute('class', 'svg-arrow-allocation');
          path.setAttribute('marker-end', 'url(#arrowhead-alloc)');
          this.svgGroup.appendChild(path);
        }

        // 2. Dashed Amber Request Arrow (Process Card -> Pool)
        // Show if process requests resource and has not finished
        if (reqCount > 0 && !isFinished) {
          const startX = (cardRect.left + (cardRect.width * (0.5 + (j * 0.15)))) - wrapperRect.left;
          const startY = (cardRect.top) - wrapperRect.top;
          const endX = (poolRect.left + poolRect.width / 2) - wrapperRect.left;
          const endY = (poolRect.bottom) - wrapperRect.top;

          const pathD = this.computeCurve(startX, startY, endX, endY);
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathD);

          if (isDeadlocked) {
            path.setAttribute('class', 'svg-arrow-request deadlocked');
            path.setAttribute('marker-end', 'url(#arrowhead-deadlock)');
          } else if (isEvaluating) {
            path.setAttribute('class', 'svg-arrow-request active-eval');
            path.setAttribute('marker-end', 'url(#arrowhead-eval)');
          } else {
            path.setAttribute('class', 'svg-arrow-request');
            path.setAttribute('marker-end', 'url(#arrowhead-req)');
          }

          this.svgGroup.appendChild(path);
        }
      }
    }
  }

  /**
   * Computes a cubic Bézier curve between two points
   */
  computeCurve(x1, y1, x2, y2) {
    const dy = y2 - y1;
    const cp1Y = y1 + dy * 0.45;
    const cp2Y = y2 - dy * 0.45;
    return `M ${x1} ${y1} C ${x1} ${cp1Y}, ${x2} ${cp2Y}, ${x2} ${y2}`;
  }

  /**
   * Animates physical flying tokens from a completed Process Card to the Available Resource Pools
   */
  animateFlyingTokens(processIndex, flyingTokens, callback) {
    if (!flyingTokens || flyingTokens.length === 0) {
      if (callback) callback();
      return;
    }

    const card = document.getElementById(`process-card-${processIndex}`);
    if (!card) {
      if (callback) callback();
      return;
    }

    const cardRect = card.getBoundingClientRect();
    let completedAnimations = 0;
    const totalAnimations = flyingTokens.reduce((sum, item) => sum + item.count, 0);

    if (totalAnimations === 0) {
      if (callback) callback();
      return;
    }

    flyingTokens.forEach((tokenGroup) => {
      const resIdx = tokenGroup.resource_index;
      const count = tokenGroup.count;
      const pool = document.getElementById(`resource-pool-${resIdx}`);
      if (!pool) return;

      const poolRect = pool.getBoundingClientRect();
      const colorHex = this.resourceHexes[resIdx % this.resourceHexes.length];

      for (let k = 0; k < count; k++) {
        // Create flying DOM chip
        const chip = document.createElement('div');
        chip.className = 'flying-token';
        chip.style.backgroundColor = colorHex;
        chip.textContent = tokenGroup.resource.substring(0, 2);

        // Start position centered at card's allocated chips
        const startX = cardRect.left + (cardRect.width / 2) + (k * 6 - count * 3);
        const startY = cardRect.top + 60;

        // End position inside target resource pool box
        const endX = poolRect.left + (poolRect.width / 2) + (k * 4 - count * 2);
        const endY = poolRect.top + (poolRect.height / 2);

        chip.style.left = `${startX}px`;
        chip.style.top = `${startY}px`;
        this.particlesLayer.appendChild(chip);

        // Web Animations API for smooth Bézier trajectory
        const duration = 650 + (k * 100);
        const animation = chip.animate([
          {
            transform: 'translate(0, 0) scale(1)',
            opacity: 1
          },
          {
            transform: `translate(${(endX - startX) * 0.5 - 30}px, ${(endY - startY) * 0.3}px) scale(1.25)`,
            opacity: 0.95,
            offset: 0.4
          },
          {
            transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.85)`,
            opacity: 0.9
          }
        ], {
          duration: duration,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        });

        animation.onfinish = () => {
          chip.remove();
          completedAnimations++;
          // Trigger bounce on target pool
          pool.classList.add('highlight-gain');
          setTimeout(() => pool.classList.remove('highlight-gain'), 400);

          if (completedAnimations >= totalAnimations && callback) {
            callback();
          }
        };
      }
    });
  }
}
