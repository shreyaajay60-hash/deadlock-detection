/**
 * Matrix Editor Controller for Deadlock Detection Visualizer
 * Allows users to configure arbitrary N processes and M resource types,
 * editing Available, Allocation, and Request matrices dynamically.
 */

class MatrixEditor {
  constructor(onSimulationReady) {
    this.onSimulationReady = onSimulationReady;
    this.modal = document.getElementById('modal-custom');
    this.openBtn = document.getElementById('btn-open-custom');
    this.closeBtn = document.getElementById('btn-close-modal');
    this.cancelBtn = document.getElementById('btn-cancel-custom');
    this.applyBtn = document.getElementById('btn-apply-custom');
    this.rebuildBtn = document.getElementById('btn-rebuild-matrix-grid');
    this.numProcsInput = document.getElementById('input-num-procs');
    this.numResInput = document.getElementById('input-num-res');
    this.errorAlert = document.getElementById('custom-error-alert');

    this.bindEvents();
    this.buildGrid(4, 3);
  }

  bindEvents() {
    this.openBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.rebuildBtn.addEventListener('click', () => {
      const n = parseInt(this.numProcsInput.value, 10);
      const m = parseInt(this.numResInput.value, 10);
      this.buildGrid(n, m);
    });
    this.applyBtn.addEventListener('click', () => this.applyAndRun());
  }

  open() {
    this.errorAlert.style.display = 'none';
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  buildGrid(numProcs, numRes) {
    const n = Math.max(2, Math.min(6, numProcs || 4));
    const m = Math.max(1, Math.min(5, numRes || 3));
    this.numProcsInput.value = n;
    this.numResInput.value = m;

    // 1. Build Available Vector
    const availContainer = document.getElementById('custom-available-container');
    availContainer.innerHTML = '';
    for (let j = 0; j < m; j++) {
      const box = document.createElement('div');
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      box.style.alignItems = 'center';
      box.style.gap = '0.2rem';
      box.innerHTML = `
        <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);">R${j}</span>
        <input type="number" min="0" max="99" value="${j === 0 ? 1 : 1}" class="cell-input" id="custom-avail-${j}">
      `;
      availContainer.appendChild(box);
    }

    // 2. Build Allocation Matrix
    const allocTable = document.getElementById('custom-alloc-table');
    let allocHtml = '<thead><tr><th>Process</th>';
    for (let j = 0; j < m; j++) {
      allocHtml += `<th>R${j}</th>`;
    }
    allocHtml += '</tr></thead><tbody>';

    for (let i = 0; i < n; i++) {
      allocHtml += `<tr><td><strong>P${i}</strong></td>`;
      for (let j = 0; j < m; j++) {
        const defaultVal = (i === j) ? 1 : 0;
        allocHtml += `<td><input type="number" min="0" max="99" value="${defaultVal}" class="cell-input" id="custom-alloc-${i}-${j}"></td>`;
      }
      allocHtml += '</tr>';
    }
    allocHtml += '</tbody>';
    allocTable.innerHTML = allocHtml;

    // 3. Build Request Matrix
    const reqTable = document.getElementById('custom-req-table');
    let reqHtml = '<thead><tr><th>Process</th>';
    for (let j = 0; j < m; j++) {
      reqHtml += `<th>R${j}</th>`;
    }
    reqHtml += '</tr></thead><tbody>';

    for (let i = 0; i < n; i++) {
      reqHtml += `<tr><td><strong>P${i}</strong></td>`;
      for (let j = 0; j < m; j++) {
        const defaultVal = ((i + 1) % n === j) ? 1 : 0;
        reqHtml += `<td><input type="number" min="0" max="99" value="${defaultVal}" class="cell-input" id="custom-req-${i}-${j}"></td>`;
      }
      reqHtml += '</tr>';
    }
    reqHtml += '</tbody>';
    reqTable.innerHTML = reqHtml;
  }

  collectData() {
    const n = parseInt(this.numProcsInput.value, 10);
    const m = parseInt(this.numResInput.value, 10);

    const available = [];
    for (let j = 0; j < m; j++) {
      const val = parseInt(document.getElementById(`custom-avail-${j}`).value, 10);
      if (isNaN(val) || val < 0) throw new Error(`Invalid value for Available R${j}`);
      available.push(val);
    }

    const allocation = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < m; j++) {
        const val = parseInt(document.getElementById(`custom-alloc-${i}-${j}`).value, 10);
        if (isNaN(val) || val < 0) throw new Error(`Invalid value for Allocation P${i}, R${j}`);
        row.push(val);
      }
      allocation.push(row);
    }

    const request = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < m; j++) {
        const val = parseInt(document.getElementById(`custom-req-${i}-${j}`).value, 10);
        if (isNaN(val) || val < 0) throw new Error(`Invalid value for Request P${i}, R${j}`);
        row.push(val);
      }
      request.push(row);
    }

    const resource_names = Array.from({ length: m }, (_, j) => `R${j}`);

    return {
      num_processes: n,
      num_resources: m,
      available,
      allocation,
      request,
      resource_names
    };
  }

  async applyAndRun() {
    this.errorAlert.style.display = 'none';
    try {
      const payload = this.collectData();
      this.applyBtn.disabled = true;
      this.applyBtn.textContent = 'Computing...';

      const simulation = await DeadlockAPI.runSimulation(payload);
      this.close();
      if (this.onSimulationReady) {
        this.onSimulationReady(simulation, 'Custom Simulation');
      }
    } catch (err) {
      this.errorAlert.textContent = err.message || 'Validation failed';
      this.errorAlert.style.display = 'block';
    } finally {
      this.applyBtn.disabled = false;
      this.applyBtn.textContent = 'Launch Simulation';
    }
  }
}
