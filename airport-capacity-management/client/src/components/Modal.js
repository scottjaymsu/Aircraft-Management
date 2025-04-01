import React from "react";
import "../styles/Modal.css";

//Generic modal used in Airport Batch File Upload.
const Modal = ({ title, message }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{title}</h2>
        <div>{message}</div>
      </div>
    </div>
  );
};

export default Modal;
