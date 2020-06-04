import React from 'react';

const OptionContractCellRenderer = (props) => {
  const coloredContract = () => {
    if (!props.value || !props.value.includes(' ')) {
      return <></>;
    }
    return (
      <div>
        <span style={{ color: '#13b9f0' }}>{props.value.split(' ')[0]}</span>{' '}
        <span style={{ color: '#6b4af0' }}>{props.value.split(' ')[1]}</span>
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        //paddingTop: '3px',
      }}
    >
      {coloredContract()}
    </div>
  );
};

export default OptionContractCellRenderer;
