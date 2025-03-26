from flask import Flask, jsonify
from collections import deque
from datetime import datetime, timezone
import logging

app = Flask(__name__)

# Suppress Flask request logs
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

message_queue = deque()

@app.route('/messages/consume', methods=['GET'])
def get_message():
    """Retrieve and remove the first message from the queue."""
    if message_queue:
        return jsonify({"message": message_queue.popleft()})
    return jsonify({"message": None})

def store_message(message):
    """Store a message in the queue."""
    message_queue.append(message)

if __name__ == '__main__':
    current_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Load up test messages to the api endpoint so the flight plan data processor and pull them
    messages = list()

    # The first message to be popped by the docker-compose to confirm that the api is up and running
    messages.append("test")

    messages.append(
        '''<fdm:fltdMessage acid="N101QS" airline="XXX" arrArpt="KTTN" cdmPart="false" depArpt="TNCM" fdTrigger="HCS_ARRIVAL_MSG" flightRef="94907783" major="DAL" msgType="arrivalInformation" sensitivity="A" sourceFacility="KZOB" sourceTimeStamp="2025-03-25T03:01:21Z">
        <fdm:arrivalInformation>
            <nxcm:qualifiedAircraftId aircraftCategory="JET" userCategory="COMMERCIAL">
            <nxce:aircraftId>RPA5722</nxce:aircraftId>
            <nxce:computerId>
                <nxce:facilityIdentifier>KZOB</nxce:facilityIdentifier>
            </nxce:computerId>
            <nxce:gufi>KN01781300</nxce:gufi>
            <nxce:igtd>2025-03-25T01:20:00Z</nxce:igtd>
            <nxce:departurePoint>
                <nxce:airport>KLGA</nxce:airport>
            </nxce:departurePoint>
            <nxce:arrivalPoint>
                <nxce:airport>KTTN</nxce:airport>
            </nxce:arrivalPoint>
            </nxcm:qualifiedAircraftId>
            <nxcm:timeOfArrival estimated="false">''' + current_time + '''</nxcm:timeOfArrival>
            <nxcm:ncsmFlightTimeData>
            <nxcm:etd etdType="ACTUAL" timeValue="2025-03-25T01:51:00Z"/>
            <nxcm:eta etaType="ACTUAL" timeValue="''' + current_time + '''"/>
            <nxcm:rvsmData currentCompliance="true" equipped="true" futureCompliance="true"/>
            </nxcm:ncsmFlightTimeData>
        </fdm:arrivalInformation>
        </fdm:fltdMessage>'''
    )

    messages.append(
        '''<fdm:fltdMessage acid="N104QS" airline="XXX" arrArpt="KTEB" cdmPart="false" depArpt="KHPN" fdTrigger="HCS_DEPARTURE_MSG" flightRef="94938900" major="HAL" msgType="departureInformation" sensitivity="A" sourceFacility="PZHN" sourceTimeStamp="2025-03-25T03:10:23Z">
            <fdm:departureInformation>
                <nxcm:qualifiedAircraftId aircraftCategory="JET" userCategory="COMMERCIAL">
                <nxce:aircraftId>HAL520</nxce:aircraftId>
                <nxce:computerId>
                    <nxce:facilityIdentifier>PZHN</nxce:facilityIdentifier>
                    <nxce:idNumber>186</nxce:idNumber>
                </nxce:computerId>
                <nxce:igtd>2025-03-25T02:50:00Z</nxce:igtd>
                <nxce:departurePoint>
                    <nxce:airport>PHLI</nxce:airport>
                </nxce:departurePoint>
                <nxce:arrivalPoint>
                    <nxce:airport>PHKO</nxce:airport>
                </nxce:arrivalPoint>
                </nxcm:qualifiedAircraftId>
                <nxcm:flightAircraftSpecs>B712</nxcm:flightAircraftSpecs>
                <nxcm:timeOfDeparture estimated="false">''' + current_time + '''</nxcm:timeOfDeparture>
                <nxcm:timeOfArrival estimated="true">2025-03-25T03:50:00Z</nxcm:timeOfArrival>
                <nxcm:ncsmFlightTimeData>
                <nxcm:etd etdType="ACTUAL" timeValue="''' + current_time + '''"/>
                <nxcm:eta etaType="ESTIMATED" timeValue="2025-03-25T03:54:16Z"/>
                <nxcm:rvsmData currentCompliance="true" equipped="true" futureCompliance="true"/>
                </nxcm:ncsmFlightTimeData>
            </fdm:departureInformation>
        </fdm:fltdMessage>'''
    )

    for message in messages:
        store_message(message)

    app.run(debug=True, host='0.0.0.0')
