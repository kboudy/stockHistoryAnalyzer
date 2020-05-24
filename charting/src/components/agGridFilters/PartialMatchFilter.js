import React, {
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import _ from 'lodash';

const useStyles = makeStyles((theme) => ({
  columnChoiceList: {
    border: '2px solid #bbaae0',
    backgroundColor: '#bbaae0',
    borderRadius: '5px',
  },
}));

export default forwardRef((props, ref) => {
  const classes = useStyles();

  const inputRef = useRef();
  const shellRef = useRef();

  const [filterText, setFilterText] = useState('');

  const isValid = (text) => {
    return text === 'suen';
  };
  useImperativeHandle(ref, () => ({
    getModel: () => {
      return { value: filterText };
    },

    setModel: (model) => {
      setFilterText(model ? model.value : '');
    },

    doesFilterPass: (params) => isValid(filterText),

    afterGuiAttached: (params) => {
      shellRef.current.style.display = 'block';
      inputRef.current.focus();
    },

    isFilterActive: () => {
      console.log('isFilterActive');
      return isValid(filterText) && filterText !== '';
    },
  }));

  const handleChange = (e) => {
    setFilterText(e.target.value);
    //props.filterModifiedCallback();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isValid(filterText)) {
      props.filterChangedCallback();
      shellRef.current.style.display = 'none'; // hack - I want the filter gone when I press enter
    }
  };

  return (
    <div className={classes.columnChoiceList} ref={shellRef}>
      <input
        type="text"
        ref={inputRef}
        style={{ height: '20px' }}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        className="form-control"
        onBlur={() => (shellRef.current.style.display = 'none')}
      />
    </div>
  );
});
