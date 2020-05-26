import React, { Component } from 'react';
import { getMongoFilter } from '../../helpers/commonMethods';

export default class StringParseFloatingFilter extends Component {
  constructor(props) {
    super(props);

    this.state = {
      maxValue: props.maxValue,
      currentValue: '',
    };
  }

  valueChanged = (event) => {
    this.setState(
      {
        currentValue: event.target.value,
      },
      () => {
        // using "getMongoFilter" only to test validity here
        const result = getMongoFilter(this.state.currentValue);
        if (result.valid) {
          this.props.parentFilterInstance((instance) => {
            // just hard coding "equals" - it doesn't matter what ag grid "type" is
            instance.onFloatingFilterChanged('equals', this.state.currentValue);
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
