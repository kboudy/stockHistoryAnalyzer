import React from 'react';

const CheckboxCellRenderer = (props) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '3px',
      }}
    >
      <input type="checkbox" checked={props.value} readOnly />
    </div>
  );
};

export default CheckboxCellRenderer;
