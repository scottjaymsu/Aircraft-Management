import React from "react";
import { FaBell } from "react-icons/fa";
import "./component.css";
import "../styles/Scrollable.css";

const NotificationCenter = ({ notifications, visible, toggleVisibility, handleLocationClick }) => {
  return (
    <div id="notification-center" className={visible ? "visible" : ""} >
      <button id="notif-toggle" onClick={toggleVisibility}>
        <FaBell size={20} />
      </button>
      <div id="notif-list" className="scrollable-content">
        {notifications.map((notif, index) => (
          <i className="notif-wrapper" key={index} onClick={() => handleLocationClick(notif.title)}
          style={{ cursor: "pointer" }}>
            {notif.message}
          </i>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;
