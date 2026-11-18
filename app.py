"""
Flask Web Application for Deadlock Detection Visualizer.
Provides REST APIs for algorithm execution, preset examples, and static UI assets.
Production-ready for deployment on Render, Heroku, Railway, or local environments.
"""

import os
from flask import Flask, render_template, jsonify, request
from deadlock_algorithm import DeadlockDetector, get_predefined_examples

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/healthz")
def health_check():
    """Lightweight health check endpoint for cloud monitoring and Render zero-downtime probes."""
    return jsonify({"status": "healthy", "service": "deadlock-detection-visualizer"}), 200


@app.route("/api/examples", methods=["GET"])
def list_examples():
    examples = get_predefined_examples()
    return jsonify({
        "status": "success",
        "examples": examples
    })


@app.route("/api/example/<example_id>", methods=["GET"])
def get_example_trace(example_id):
    examples = get_predefined_examples()
    if example_id not in examples:
        return jsonify({"status": "error", "message": f"Example '{example_id}' not found."}), 404

    ex = examples[example_id]
    detector = DeadlockDetector(
        num_processes=ex["num_processes"],
        num_resources=ex["num_resources"],
        available=ex["available"],
        allocation=ex["allocation"],
        request=ex["request"],
        resource_names=ex.get("resource_names")
    )
    result = detector.execute_and_record()
    return jsonify({
        "status": "success",
        "example_metadata": ex,
        "simulation": result
    })


@app.route("/api/run", methods=["POST"])
def run_simulation():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No JSON payload provided"}), 400

    try:
        num_processes = int(data.get("num_processes"))
        num_resources = int(data.get("num_resources"))
        available = data.get("available")
        allocation = data.get("allocation")
        req_matrix = data.get("request")
        resource_names = data.get("resource_names")

        detector = DeadlockDetector(
            num_processes=num_processes,
            num_resources=num_resources,
            available=available,
            allocation=allocation,
            request=req_matrix,
            resource_names=resource_names
        )

        valid, error_msg = detector.validate_inputs()
        if not valid:
            return jsonify({"status": "error", "message": error_msg}), 400

        result = detector.execute_and_record()
        return jsonify({
            "status": "success",
            "simulation": result
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/api/validate", methods=["POST"])
def validate_simulation_inputs():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No payload"}), 400

    try:
        detector = DeadlockDetector(
            num_processes=int(data.get("num_processes", 0)),
            num_resources=int(data.get("num_resources", 0)),
            available=data.get("available", []),
            allocation=data.get("allocation", []),
            request=data.get("request", [])
        )
        valid, msg = detector.validate_inputs()
        return jsonify({"valid": valid, "message": msg})
    except Exception as e:
        return jsonify({"valid": False, "message": str(e)})


if __name__ == "__main__":
    # Render and cloud platforms supply the PORT environment variable dynamically
    port = int(os.environ.get("PORT", 5000))
    # In production, debug mode must be False unless explicitly enabled via FLASK_DEBUG=true
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"Starting Deadlock Detection Visualizer on port {port} (debug={debug_mode})")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
