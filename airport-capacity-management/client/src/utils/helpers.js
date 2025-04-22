export const getStatusColor = (parking_taken_or_status, total_parking) => {
  // If parking_taken_or_status is a string, handle it as a status message
  if (typeof parking_taken_or_status === "string") {
    switch (parking_taken_or_status) {
      case "Overcapacity":
        return "#c76666"; // red
      case "Reaching Capacity":
        return "#ecac57"; // orange
      default:
        return "#b9be80"; // green or default
    }
  } 
  // If parking_taken_or_status is a number, calculate the status based on the ratio
  else {
    const status = parking_taken_or_status / total_parking;
    if (status === 1) {
      return "#c76666"; // red
    } else if (status >= 0.8) {
      return "#ecac57"; // orange
    } else {
      return "#b9be80"; // green
    }
  }
};

export const getColor = (capacity) => {
  if (capacity >= 80) {
    return "#c76666"; // red
  } else if (capacity >= 50) {
    return "#ecac57"; // orange
  } else {
    return "#b9be80"; // green
  }
};

// Get CSS styling class for the status bubble
export const getStatusClass = (capacity) => {
  if (capacity >= 80) {
    return "status-bubble full";
  } else if (capacity >= 50) {
    return "status-bubble approaching";
  } else {
    return "status-bubble open";
  }
};
