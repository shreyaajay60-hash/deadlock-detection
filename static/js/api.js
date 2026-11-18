/**
 * API Service for Deadlock Detection Visualizer
 */
const DeadlockAPI = {
  async getExamples() {
    try {
      const res = await fetch('/api/examples');
      const data = await res.json();
      if (data.status === 'success') {
        return data.examples;
      }
      throw new Error(data.message || 'Failed to fetch examples');
    } catch (err) {
      console.error('Error fetching examples:', err);
      throw err;
    }
  },

  async getExampleTrace(presetId) {
    try {
      const res = await fetch(`/api/example/${encodeURIComponent(presetId)}`);
      const data = await res.json();
      if (data.status === 'success') {
        return data;
      }
      throw new Error(data.message || `Failed to fetch example ${presetId}`);
    } catch (err) {
      console.error('Error fetching example trace:', err);
      throw err;
    }
  },

  async runSimulation(payload) {
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        return data.simulation;
      }
      throw new Error(data.message || 'Simulation execution failed');
    } catch (err) {
      console.error('Error running simulation:', err);
      throw err;
    }
  },

  async validate(payload) {
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      return { valid: false, message: err.message };
    }
  }
};
