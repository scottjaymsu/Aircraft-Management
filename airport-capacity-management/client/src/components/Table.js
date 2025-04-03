import React from 'react';
import '../styles/Table.css'

//Generic component for a table across all of our website.
const Table = ({ headers, rows, title, className, getRowProps = () => ({}) }) => {

  //We need to calculate column width here because it looks wonky if it's not equal length for every column
  const columnWidth = `${100 / headers.length}%`;

  return (
    <div className="table-container">
      <h2>{title}</h2>
      <table cellPadding="10" className={className}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} style={{width: columnWidth }}>{header}</th>
            ))}
          </tr>
        </thead>
          <tbody>
          {rows.map((row, index) => {
            {/* Industry standard seems to be sending "props" to be able to style rows differently than the original
              component is set up to style. Pass them as parameters in the Table definition. Probably should include one for
              headers too at some point.*/}
              const rowProps = getRowProps(row, index);
              return (
                <tr key={index} {...rowProps}>
                {row.map((cell, cellIndex) => (
                    <td key={cellIndex} style={{width: columnWidth }}>{cell}</td>
                ))}
              </tr>
              );
            })}
          </tbody>
      </table>
    </div>
  );
};

export default Table;
