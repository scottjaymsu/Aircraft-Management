from flask import Flask, jsonify
from queue import Queue, Empty
import logging

# Silence Flask's request logs
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)

queue = Queue()

def add_flight_plan(plan):
    queue.put(plan)

# API endpoint to get the next flight plan
@app.route('/flight-plan', methods=['GET'])
def get_next_flight_plan():
    try:
        flight_plan = queue.get_nowait()
        return jsonify({"flight_plan": flight_plan}), 200
    except Empty:
        return jsonify({"flight_plan": None}), 200

# Function to run the Flask app
def run_app():
    app.run(host='0.0.0.0', port=5000)