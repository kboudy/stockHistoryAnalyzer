import React, {
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import _ from 'lodash';

import { getMongoFilter } from '../../helpers/miscMethods';

const useStyles = makeStyles((theme) => ({
  columnChoiceList: {
    backgroundColor: '#2f6fed',
    borderRadius: '5px',
  },
}));

export default forwardRef((props, ref) => {
  const classes = useStyles();

  const inputRef = useRef();
  const shellRef = useRef();

  const [filterText, setFilterText] = useState('');
  const [border, setBorder] = useState('2px solid #2f6fed');

  const isValid = (text) => {
    return true;
  };

  useImperativeHandle(ref, () => ({
    getModel: () => {
      return { filter: filterText };
    },

    setModel: (model) => {
      setFilterText(model ? model.filter : '');
    },

    doesFilterPass: (params) => isValid(filterText),

    afterGuiAttached: (params) => {
      setBorderColorBasedOnFilter(filterText);
      shellRef.current.style.display = 'block';
      inputRef.current.focus();
    },

    isFilterActive: () => {
      console.log('isFilterActive');
      return isValid(filterText) && filterText !== '';
    },
  }));

  const setBorderColorBasedOnFilter = (text) => {
    const mf = getMongoFilter({ filter: text });
    debugger;
    if (mf.valid) {
      setBorder('2px solid #29c434');
    } else if (mf.valid === null) {
      setBorder('2px solid #2f6fed');
    }
  };

  const handleChange = (e) => {
    setBorderColorBasedOnFilter(e.target.value);
    setFilterText(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isValid(filterText)) {
      props.filterChangedCallback();

      shellRef.current.style.display = 'none'; // hack - I want the filter gone when I press enter
    }
  };

  return (
    <div className={classes.columnChoiceList} style={{ border }} ref={shellRef}>
      <input
        type="text"
        ref={inputRef}
        style={{ height: '20px' }}
        value={filterText}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        className="form-control"
        onBlur={() => (shellRef.current.style.display = 'none')}
      />
    </div>
  );
});
