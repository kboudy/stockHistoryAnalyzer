import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import ReceiptIcon from '@material-ui/icons/Receipt';

const ButtonCellRenderer = (props) => {
  if (!props.data.buyDate_option_chains) {
    return <></>;
  }
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '3px',
      }}
    >
      <IconButton size="small" onClick={() => props.onClick(props.data)}>
        <ReceiptIcon style={{ width: '18px', height: '18px' }} />
      </IconButton>
    </div>
  );
};

export default ButtonCellRenderer;
