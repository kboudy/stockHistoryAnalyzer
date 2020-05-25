import React, { Component } from 'react';

export default class StringParseFloatingFilter extends Component {
  constructor(props) {
    super(props);

    this.state = {
      maxValue: props.maxValue,
      currentValue: '',
    };
  }

  parseStringToFilter = (fieldValue) => {
    // ag grid filter types:
    // https://www.ag-grid.com/javascript-grid-filter-provided-simple/
    if (fieldValue !== 0 && fieldValue !== '' && !fieldValue) {
      return { type: null };
    }

    const strFieldValue = `${fieldValue}`;
    if (strFieldValue.startsWith('>=')) {
      debugger;
    }

    if (strFieldValue.startsWith('!')) {
      const cropped = strFieldValue.slice(1).trim();
      if (cropped.trim() === '') {
        return { type: null, value: strFieldValue };
      }
      if (cropped.includes(',')) {
        const isValidList =
          cropped.split(',').filter((s) => s.trim() === '').length === 0;
        if (!isValidList) {
          return {
            type: null,
            value: strFieldValue,
          };
        }
        return {
          type: 'notContains',
          value: strFieldValue,
        };
      } else {
        return {
          type: 'notEqual',
          value: strFieldValue,
        };
      }
    }

    if (strFieldValue.includes(',')) {
      const isValidList =
        strFieldValue.split(',').filter((s) => s.trim() === '').length === 0;
      if (!isValidList) {
        return {
          type: null,
          value: strFieldValue,
        };
      }
      return {
        type: 'contains',
        value: strFieldValue,
      };
    }

    if (strFieldValue.startsWith('>=')) {
      return {
        type: 'greaterThanOrEqual',
        value: strFieldValue,
      };
    }

    if (strFieldValue.startsWith('<=')) {
      const cropped = strFieldValue.slice(2).trim();
      return {
        type: 'lessThanOrEqual',
        value: strFieldValue,
      };
    }

    if (strFieldValue.startsWith('>')) {
      return {
        type: 'greaterThan',
        value: strFieldValue,
      };
    }
    if (strFieldValue.startsWith('<')) {
      const cropped = strFieldValue.slice(1).trim();
      return {
        type: 'lessThan',
        value: strFieldValue,
      };
    }

    if (strFieldValue.startsWith('=')) {
      return {
        type: 'equals',
        value: strFieldValue,
      };
    }

    return {
      type: 'equals',
      value: strFieldValue,
    };
  };

  valueChanged = (event) => {
    this.setState(
      {
        currentValue: event.target.value,
      },
      () => {
        const { type, value } = this.parseStringToFilter(
          this.state.currentValue
        );
        if (type) {
          this.props.parentFilterInstance(function (instance) {
            instance.onFloatingFilterChanged(type, value);
          });
        }
      }
    );
  };

  onParentModelChanged(parentModel) {
    // note that the filter could be anything here, but our purposes we're assuming a greater than filter only,
    // so just read off the value and use that
    console.log(
      `onParentModelChanged: ${!parentModel ? '' : parentModel.filter}`
    );
    this.setState({
      currentValue: !parentModel ? '' : parentModel.filter,
    });
  }

  render() {
    return (
      <input
        style={{ width: '96%' }}
        type="text"
        value={this.state.currentValue}
        onChange={this.valueChanged}
      />
    );
  }
}
