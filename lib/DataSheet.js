'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

var _Sheet = require('./Sheet');

var _Sheet2 = _interopRequireDefault(_Sheet);

var _Row = require('./Row');

var _Row2 = _interopRequireDefault(_Row);

var _Cell = require('./Cell');

var _Cell2 = _interopRequireDefault(_Cell);

var _DataCell = require('./DataCell');

var _DataCell2 = _interopRequireDefault(_DataCell);

var _DataEditor = require('./DataEditor');

var _DataEditor2 = _interopRequireDefault(_DataEditor);

var _ValueViewer = require('./ValueViewer');

var _ValueViewer2 = _interopRequireDefault(_ValueViewer);

var _keys = require('./keys');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var isEmpty = function isEmpty(obj) {
  return Object.keys(obj).length === 0;
};

// Helper to compute virtualization metrics for rows to keep renderRows clean
// Returns an object with the following keys:
// - start: Index of the first column to render (including overscan)
// - end: Index of the last column to render (including overscan)
// - leftPad: Width of invisible space before the first rendered column
// - rightPad: Width of invisible space after the last rendered column
// - visibleCount: Total number of columns being rendered (including overscan)

var computeRowVirtualization = function computeRowVirtualization(_ref) {
  var totalRows = _ref.totalRows,
      rowHeight = _ref.rowHeight,
      viewportHeight = _ref.viewportHeight,
      scrollTop = _ref.scrollTop,
      rowOverscanCount = _ref.rowOverscanCount,
      pinnedRowCount = _ref.pinnedRowCount;

  var overscan = typeof rowOverscanCount === 'number' ? rowOverscanCount : 5;
  var safeScrollTop = scrollTop || 0;
  var pinnedRows = Math.min(Math.max(0, pinnedRowCount || 0), Math.max(0, totalRows));
  var start = Math.max(pinnedRows, Math.floor(safeScrollTop / rowHeight) - overscan);
  var end = Math.min(totalRows - 1, Math.floor((safeScrollTop + viewportHeight) / rowHeight) + overscan);
  var topPad = Math.max(0, (start - pinnedRows) * rowHeight);
  var visibleCount = end >= start ? end - start + 1 : 0;
  var bottomPad = Math.max(0, (totalRows - pinnedRows) * rowHeight - topPad - visibleCount * rowHeight);
  return { start: start, end: end, topPad: topPad, bottomPad: bottomPad, visibleCount: visibleCount, pinnedRows: pinnedRows };
};

// Helper to compute virtualization metrics for columns to keep render logic clean
var computeColumnVirtualization = function computeColumnVirtualization(_ref2) {
  var totalCols = _ref2.totalCols,
      columnWidths = _ref2.columnWidths,
      viewportWidth = _ref2.viewportWidth,
      scrollLeft = _ref2.scrollLeft,
      rowOverscanCount = _ref2.rowOverscanCount,
      pinnedColumnCount = _ref2.pinnedColumnCount;

  var overscan = typeof rowOverscanCount === 'number' ? rowOverscanCount : 5;
  var safeScrollLeft = scrollLeft || 0;
  var vpWidth = viewportWidth || 0;

  if (!totalCols || totalCols <= 0) {
    return {
      start: 0,
      end: -1,
      leftPad: 0,
      rightPad: 0,
      visibleCount: 0,
      pinnedCols: 0,
      prefix: [0]
    };
  }

  // Build an array of widths for each column. columnWidths is required and may include zeros.
  var widths = Array.isArray(columnWidths) ? columnWidths.slice(0, totalCols).concat(Array(Math.max(0, totalCols - (columnWidths ? columnWidths.length : 0))).fill(0)) : Array(totalCols).fill(0);

  // Prefix sums for quick range width lookups
  var prefix = new Array(totalCols + 1);
  prefix[0] = 0;
  for (var i = 0; i < totalCols; i++) {
    var w = Math.max(0, widths[i] || 0); // ensure non-negative, allow zero
    prefix[i + 1] = prefix[i] + w;
    widths[i] = w; // normalize
  }

  var totalWidth = prefix[totalCols];

  // Find first column whose right edge exceeds safeScrollLeft
  var findStart = function findStart() {
    // linear scan is fine for modest col counts; could binary search on prefix
    var idx = 0;
    while (idx < totalCols && prefix[idx + 1] <= safeScrollLeft) {
      idx++;
    }return idx;
  };

  // Find last column whose left edge is before visibleRight
  var visibleRight = safeScrollLeft + vpWidth;
  var findEnd = function findEnd() {
    var idx = totalCols - 1;
    while (idx >= 0 && prefix[idx] >= visibleRight) {
      idx--;
    }return Math.max(0, idx);
  };

  var pinnedCols = Math.min(Math.max(0, pinnedColumnCount || 0), totalCols);

  var start = findStart();
  var end = findEnd();

  // Apply overscan on both sides; never virtualize pinned columns away
  start = Math.max(pinnedCols, start - overscan);
  end = Math.min(totalCols - 1, end + overscan);

  // Pad only the non-pinned scrolled-away span
  var leftPad = Math.max(0, prefix[start] - prefix[pinnedCols]);
  var visibleSliceWidth = end >= start ? prefix[end + 1] - prefix[start] : 0;
  var rightPad = Math.max(0, totalWidth - prefix[pinnedCols] - leftPad - visibleSliceWidth);

  var visibleCount = end >= start ? end - start + 1 : 0;
  return {
    start: start,
    end: end,
    leftPad: leftPad,
    rightPad: rightPad,
    visibleCount: visibleCount,
    pinnedCols: pinnedCols,
    prefix: prefix
  };
};

var range = function range(start, end) {
  var array = [];
  var inc = end - start > 0;
  for (var i = start; inc ? i <= end : i >= end; inc ? i++ : i--) {
    inc ? array.push(i) : array.unshift(i);
  }
  return array;
};

var defaultParsePaste = function defaultParsePaste(str) {
  return str.split(/\r\n|\n|\r/).map(function (row) {
    return row.split('\t');
  });
};

var DataSheet = function (_PureComponent) {
  _inherits(DataSheet, _PureComponent);

  function DataSheet(props) {
    _classCallCheck(this, DataSheet);

    var _this = _possibleConstructorReturn(this, (DataSheet.__proto__ || Object.getPrototypeOf(DataSheet)).call(this, props));

    _this.onMouseDown = _this.onMouseDown.bind(_this);
    _this.onMouseUp = _this.onMouseUp.bind(_this);
    _this.onMouseOver = _this.onMouseOver.bind(_this);
    _this.onDoubleClick = _this.onDoubleClick.bind(_this);
    _this.onContextMenu = _this.onContextMenu.bind(_this);
    _this.handleNavigate = _this.handleNavigate.bind(_this);
    _this.handleKey = _this.handleKey.bind(_this);
    _this.handleCut = _this.handleCut.bind(_this);
    _this.handleCopy = _this.handleCopy.bind(_this);
    _this.handlePaste = _this.handlePaste.bind(_this);
    _this.pageClick = _this.pageClick.bind(_this);
    _this.onChange = _this.onChange.bind(_this);
    _this.onRevert = _this.onRevert.bind(_this);
    _this.isSelected = _this.isSelected.bind(_this);
    _this.isEditing = _this.isEditing.bind(_this);
    _this.isClearing = _this.isClearing.bind(_this);
    _this.handleComponentKey = _this.handleComponentKey.bind(_this);

    _this.handleKeyboardCellMovement = _this.handleKeyboardCellMovement.bind(_this);

    _this.defaultState = {
      start: {},
      end: {},
      selecting: false,
      forceEdit: false,
      editing: {},
      clear: {},
      scrollTop: 0,
      scrollLeft: 0
    };
    _this.state = _this.defaultState;

    _this.removeAllListeners = _this.removeAllListeners.bind(_this);
    _this.handleIEClipboardEvents = _this.handleIEClipboardEvents.bind(_this);
    _this.handleScroll = _this.handleScroll.bind(_this);
    return _this;
  }

  _createClass(DataSheet, [{
    key: 'removeAllListeners',
    value: function removeAllListeners() {
      document.removeEventListener('mousedown', this.pageClick);
      document.removeEventListener('mouseup', this.onMouseUp);
      document.removeEventListener('cut', this.handleCut);
      document.removeEventListener('copy', this.handleCopy);
      document.removeEventListener('paste', this.handlePaste);
      document.removeEventListener('keydown', this.handleIEClipboardEvents);
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      // Add listener scoped to the DataSheet that catches otherwise unhandled
      // keyboard events when displaying components
      this.dgDom && this.dgDom.addEventListener('keydown', this.handleComponentKey);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.dgDom && this.dgDom.removeEventListener('keydown', this.handleComponentKey);
      this.removeAllListeners();
    }
  }, {
    key: 'isSelectionControlled',
    value: function isSelectionControlled() {
      return 'selected' in this.props;
    }
  }, {
    key: 'getState',
    value: function getState() {
      var state = this.state;
      if (this.isSelectionControlled()) {
        var _ref3 = this.props.selected || {},
            start = _ref3.start,
            end = _ref3.end;

        start = start || this.defaultState.start;
        end = end || this.defaultState.end;
        state = _extends({}, state, { start: start, end: end });
      }
      return state;
    }
  }, {
    key: '_setState',
    value: function _setState(state) {
      if (this.isSelectionControlled() && ('start' in state || 'end' in state)) {
        var start = state.start,
            end = state.end,
            rest = _objectWithoutProperties(state, ['start', 'end']);

        var _props = this.props,
            selected = _props.selected,
            onSelect = _props.onSelect;

        selected = selected || {};
        if (!start) {
          start = 'start' in selected ? selected.start : this.defaultState.start;
        }
        if (!end) {
          end = 'end' in selected ? selected.end : this.defaultState.end;
        }
        onSelect && onSelect({ start: start, end: end });
        this.setState(rest);
      } else {
        this.setState(state);
      }
    }
  }, {
    key: 'pageClick',
    value: function pageClick(e) {
      if (this.props.disablePageClick) return;
      var element = this.dgDom;
      if (!element.contains(e.target)) {
        this.setState(this.defaultState);
        this.removeAllListeners();
      }
    }
  }, {
    key: 'handleCut',
    value: function handleCut(e) {
      if (isEmpty(this.state.editing)) {
        e.preventDefault();
        this.handleCopy(e);

        var _getState = this.getState(),
            start = _getState.start,
            end = _getState.end;

        this.clearSelectedCells(start, end);
      }
    }
  }, {
    key: 'handleIEClipboardEvents',
    value: function handleIEClipboardEvents(e) {
      if (e.ctrlKey) {
        if (e.keyCode === 67) {
          // C - copy
          this.handleCopy(e);
        } else if (e.keyCode === 88) {
          // X - cut
          this.handleCut(e);
        } else if (e.keyCode === 86 || e.which === 86) {
          // P - patse
          this.handlePaste(e);
        }
      }
    }
  }, {
    key: 'handleCopy',
    value: function handleCopy(e) {
      if (isEmpty(this.state.editing)) {
        e.preventDefault();
        var _props2 = this.props,
            dataRenderer = _props2.dataRenderer,
            valueRenderer = _props2.valueRenderer,
            data = _props2.data;

        var _getState2 = this.getState(),
            start = _getState2.start,
            end = _getState2.end;

        if (this.props.handleCopy) {
          this.props.handleCopy({
            event: e,
            dataRenderer: dataRenderer,
            valueRenderer: valueRenderer,
            data: data,
            start: start,
            end: end,
            range: range
          });
        } else {
          var text = range(start.i, end.i).map(function (i) {
            return range(start.j, end.j).map(function (j) {
              var cell = data[i][j];
              var value = dataRenderer ? dataRenderer(cell, i, j) : null;
              if (value === '' || value === null || typeof value === 'undefined') {
                return valueRenderer(cell, i, j);
              }
              return value;
            }).join('\t');
          }).join('\n');
          if (window.clipboardData && window.clipboardData.setData) {
            window.clipboardData.setData('Text', text);
          } else {
            e.clipboardData.setData('text/plain', text);
          }
        }
      }
    }
  }, {
    key: 'handlePaste',
    value: function handlePaste(e) {
      if (isEmpty(this.state.editing)) {
        var _getState3 = this.getState(),
            start = _getState3.start,
            end = _getState3.end;

        start = { i: Math.min(start.i, end.i), j: Math.min(start.j, end.j) };
        end = { i: Math.max(start.i, end.i), j: Math.max(start.j, end.j) };

        var parse = this.props.parsePaste || defaultParsePaste;
        var changes = [];
        var pasteData = [];
        if (window.clipboardData && window.clipboardData.getData) {
          // IE
          pasteData = parse(window.clipboardData.getData('Text'));
        } else if (e.clipboardData && e.clipboardData.getData) {
          pasteData = parse(e.clipboardData.getData('text/plain'));
        }

        // in order of preference
        var _props3 = this.props,
            data = _props3.data,
            onCellsChanged = _props3.onCellsChanged,
            onPaste = _props3.onPaste,
            onChange = _props3.onChange;

        if (onCellsChanged) {
          var additions = [];
          pasteData.forEach(function (row, i) {
            row.forEach(function (value, j) {
              end = { i: start.i + i, j: start.j + j };
              var cell = data[end.i] && data[end.i][end.j];
              if (!cell) {
                additions.push({ row: end.i, col: end.j, value: value });
              } else if (!cell.readOnly) {
                changes.push({ cell: cell, row: end.i, col: end.j, value: value });
              }
            });
          });
          if (additions.length) {
            onCellsChanged(changes, additions);
          } else {
            onCellsChanged(changes);
          }
        } else if (onPaste) {
          pasteData.forEach(function (row, i) {
            var rowData = [];
            row.forEach(function (pastedData, j) {
              end = { i: start.i + i, j: start.j + j };
              var cell = data[end.i] && data[end.i][end.j];
              rowData.push({ cell: cell, data: pastedData });
            });
            changes.push(rowData);
          });
          onPaste(changes);
        } else if (onChange) {
          pasteData.forEach(function (row, i) {
            row.forEach(function (value, j) {
              end = { i: start.i + i, j: start.j + j };
              var cell = data[end.i] && data[end.i][end.j];
              if (cell && !cell.readOnly) {
                onChange(cell, end.i, end.j, value);
              }
            });
          });
        }
        this._setState({ end: end });
      }
    }
  }, {
    key: 'handleKeyboardCellMovement',
    value: function handleKeyboardCellMovement(e) {
      var commit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var _getState4 = this.getState(),
          start = _getState4.start,
          editing = _getState4.editing;

      var data = this.props.data;

      var isEditing = editing && !isEmpty(editing);
      var currentCell = data[start.i] && data[start.i][start.j];

      if (isEditing && !commit) {
        return false;
      }
      var hasComponent = currentCell && currentCell.component;

      var keyCode = e.which || e.keyCode;

      if (hasComponent && isEditing) {
        e.preventDefault();
        return;
      }

      if (keyCode === _keys.TAB_KEY) {
        this.handleNavigate(e, { i: 0, j: e.shiftKey ? -1 : 1 }, true);
      } else if (keyCode === _keys.RIGHT_KEY) {
        this.handleNavigate(e, { i: 0, j: 1 });
      } else if (keyCode === _keys.LEFT_KEY) {
        this.handleNavigate(e, { i: 0, j: -1 });
      } else if (keyCode === _keys.UP_KEY) {
        this.handleNavigate(e, { i: -1, j: 0 });
      } else if (keyCode === _keys.DOWN_KEY) {
        this.handleNavigate(e, { i: 1, j: 0 });
      } else if (commit && keyCode === _keys.ENTER_KEY) {
        this.handleNavigate(e, { i: e.shiftKey ? -1 : 1, j: 0 });
      }
    }
  }, {
    key: 'handleKey',
    value: function handleKey(e) {
      if (e.isPropagationStopped && e.isPropagationStopped()) {
        return;
      }
      var keyCode = e.which || e.keyCode;

      var _getState5 = this.getState(),
          start = _getState5.start,
          end = _getState5.end,
          editing = _getState5.editing;

      var isEditing = editing && !isEmpty(editing);
      var noCellsSelected = !start || isEmpty(start);
      var ctrlKeyPressed = e.ctrlKey || e.metaKey;
      var deleteKeysPressed = keyCode === _keys.DELETE_KEY || keyCode === _keys.BACKSPACE_KEY;
      var enterKeyPressed = keyCode === _keys.ENTER_KEY;
      var numbersPressed = keyCode >= 48 && keyCode <= 57;
      var lettersPressed = keyCode >= 65 && keyCode <= 90;
      var latin1Supplement = keyCode >= 160 && keyCode <= 255;
      var numPadKeysPressed = keyCode >= 96 && keyCode <= 105;
      var currentCell = !noCellsSelected && this.props.data[start.i][start.j];
      var equationKeysPressed = [187 /* equal */
      , 189 /* substract */
      , 190 /* period */
      , 107 /* add */
      , 109 /* decimal point */
      , 110].indexOf(keyCode) > -1;

      if (noCellsSelected || ctrlKeyPressed) {
        return true;
      }

      if (!isEditing) {
        this.handleKeyboardCellMovement(e);
        if (deleteKeysPressed) {
          e.preventDefault();
          this.clearSelectedCells(start, end);
        } else if (currentCell && !currentCell.readOnly) {
          if (enterKeyPressed) {
            this._setState({ editing: start, clear: {}, forceEdit: true });
            e.preventDefault();
          } else if (numbersPressed || numPadKeysPressed || lettersPressed || latin1Supplement || equationKeysPressed) {
            // empty out cell if user starts typing without pressing enter
            this._setState({ editing: start, clear: start, forceEdit: false });
          }
        }
      }
    }
  }, {
    key: 'getSelectedCells',
    value: function getSelectedCells(data, start, end) {
      var selected = [];
      range(start.i, end.i).map(function (row) {
        range(start.j, end.j).map(function (col) {
          if (data[row] && data[row][col]) {
            selected.push({ cell: data[row][col], row: row, col: col });
          }
        });
      });
      return selected;
    }
  }, {
    key: 'clearSelectedCells',
    value: function clearSelectedCells(start, end) {
      var _this2 = this;

      var _props4 = this.props,
          data = _props4.data,
          onCellsChanged = _props4.onCellsChanged,
          onChange = _props4.onChange;

      var cells = this.getSelectedCells(data, start, end).filter(function (cell) {
        return !cell.cell.readOnly;
      }).map(function (cell) {
        return _extends({}, cell, { value: '' });
      });
      if (onCellsChanged) {
        onCellsChanged(cells);
        this.onRevert();
      } else if (onChange) {
        // ugly solution brought to you by https://reactjs.org/docs/react-component.html#setstate
        // setState in a loop is unreliable
        setTimeout(function () {
          cells.forEach(function (_ref4) {
            var cell = _ref4.cell,
                row = _ref4.row,
                col = _ref4.col,
                value = _ref4.value;

            onChange(cell, row, col, value);
          });
          _this2.onRevert();
        }, 0);
      }
    }
  }, {
    key: 'updateLocationSingleCell',
    value: function updateLocationSingleCell(location) {
      this._setState({
        start: location,
        end: location,
        editing: {}
      });
    }
  }, {
    key: 'updateLocationMultipleCells',
    value: function updateLocationMultipleCells(offsets) {
      var _getState6 = this.getState(),
          start = _getState6.start,
          end = _getState6.end;

      var data = this.props.data;

      var oldStartLocation = { i: start.i, j: start.j };
      var newEndLocation = {
        i: end.i + offsets.i,
        j: Math.min(data[0].length - 1, Math.max(0, end.j + offsets.j))
      };
      this._setState({
        start: oldStartLocation,
        end: newEndLocation,
        editing: {}
      });
    }
  }, {
    key: 'searchForNextSelectablePos',
    value: function searchForNextSelectablePos(isCellNavigable, data, start, offsets, jumpRow) {
      var previousRow = function previousRow(location) {
        return {
          i: location.i - 1,
          j: data[0].length - 1
        };
      };
      var nextRow = function nextRow(location) {
        return { i: location.i + 1, j: 0 };
      };
      var advanceOffset = function advanceOffset(location) {
        return {
          i: location.i + offsets.i,
          j: location.j + offsets.j
        };
      };
      var isCellDefined = function isCellDefined(_ref5) {
        var i = _ref5.i,
            j = _ref5.j;
        return data[i] && typeof data[i][j] !== 'undefined';
      };

      var newLocation = advanceOffset(start);

      while (isCellDefined(newLocation) && !isCellNavigable(data[newLocation.i][newLocation.j], newLocation.i, newLocation.j)) {
        newLocation = advanceOffset(newLocation);
      }

      if (!isCellDefined(newLocation)) {
        if (!jumpRow) {
          return null;
        }
        if (offsets.j < 0) {
          newLocation = previousRow(newLocation);
        } else {
          newLocation = nextRow(newLocation);
        }
      }

      if (isCellDefined(newLocation) && !isCellNavigable(data[newLocation.i][newLocation.j], newLocation.i, newLocation.j)) {
        return this.searchForNextSelectablePos(isCellNavigable, data, newLocation, offsets, jumpRow);
      } else if (isCellDefined(newLocation)) {
        return newLocation;
      } else {
        return null;
      }
    }
  }, {
    key: 'handleNavigate',
    value: function handleNavigate(e, offsets, jumpRow) {
      if (offsets && (offsets.i || offsets.j)) {
        var data = this.props.data;

        var _getState7 = this.getState(),
            start = _getState7.start;

        var multiSelect = e.shiftKey && !jumpRow;
        var isCellNavigable = this.props.isCellNavigable ? this.props.isCellNavigable : function () {
          return true;
        };

        if (multiSelect) {
          this.updateLocationMultipleCells(offsets);
        } else {
          var newLocation = this.searchForNextSelectablePos(isCellNavigable, data, start, offsets, jumpRow);
          if (newLocation) {
            this.updateLocationSingleCell(newLocation);
          }
        }
        e.preventDefault();
      }
    }
  }, {
    key: 'handleComponentKey',
    value: function handleComponentKey(e) {
      var _this3 = this;

      // handles keyboard events when editing components
      var keyCode = e.which || e.keyCode;
      if (![_keys.ENTER_KEY, _keys.ESCAPE_KEY, _keys.TAB_KEY].includes(keyCode)) {
        return;
      }
      var editing = this.state.editing;
      var data = this.props.data;

      var isEditing = !isEmpty(editing);
      if (isEditing) {
        var currentCell = data[editing.i][editing.j];
        var offset = e.shiftKey ? -1 : 1;
        if (currentCell && currentCell.component && !currentCell.forceComponent) {
          e.preventDefault();
          var func = this.onRevert; // ESCAPE_KEY
          if (keyCode === _keys.ENTER_KEY) {
            func = function func() {
              return _this3.handleNavigate(e, { i: offset, j: 0 });
            };
          } else if (keyCode === _keys.TAB_KEY) {
            func = function func() {
              return _this3.handleNavigate(e, { i: 0, j: offset }, true);
            };
          }
          // setTimeout makes sure that component is done handling the event before we take over
          setTimeout(function () {
            func();
            _this3.dgDom && _this3.dgDom.focus();
          }, 1);
        }
      }
    }
  }, {
    key: 'onContextMenu',
    value: function onContextMenu(evt, i, j) {
      var cell = this.props.data[i][j];
      if (this.props.onContextMenu) {
        this.props.onContextMenu(evt, cell, i, j);
      }
    }
  }, {
    key: 'onDoubleClick',
    value: function onDoubleClick(i, j) {
      var cell = this.props.data[i][j];
      if (!cell.readOnly) {
        this._setState({ editing: { i: i, j: j }, forceEdit: true, clear: {} });
      }
    }
  }, {
    key: 'onMouseDown',
    value: function onMouseDown(i, j, e) {
      var isNowEditingSameCell = !isEmpty(this.state.editing) && this.state.editing.i === i && this.state.editing.j === j;
      var editing = isEmpty(this.state.editing) || this.state.editing.i !== i || this.state.editing.j !== j ? {} : this.state.editing;

      this._setState({
        selecting: !isNowEditingSameCell,
        start: e.shiftKey ? this.state.start : { i: i, j: j },
        end: { i: i, j: j },
        editing: editing,
        forceEdit: !!isNowEditingSameCell
      });

      var ua = window.navigator.userAgent;
      var isIE = /MSIE|Trident/.test(ua);
      // Listen for Ctrl + V in case of IE
      if (isIE) {
        document.addEventListener('keydown', this.handleIEClipboardEvents);
      }

      // Keep listening to mouse if user releases the mouse (dragging outside)
      document.addEventListener('mouseup', this.onMouseUp);
      // Listen for any outside mouse clicks
      document.addEventListener('mousedown', this.pageClick);

      // Cut, copy and paste event handlers
      document.addEventListener('cut', this.handleCut);
      document.addEventListener('copy', this.handleCopy);
      document.addEventListener('paste', this.handlePaste);
    }
  }, {
    key: 'onMouseOver',
    value: function onMouseOver(i, j) {
      if (this.state.selecting && isEmpty(this.state.editing)) {
        this._setState({ end: { i: i, j: j } });
      }
    }
  }, {
    key: 'onMouseUp',
    value: function onMouseUp() {
      this._setState({ selecting: false });
      document.removeEventListener('mouseup', this.onMouseUp);
    }
  }, {
    key: 'onChange',
    value: function onChange(row, col, value) {
      var _props5 = this.props,
          onChange = _props5.onChange,
          onCellsChanged = _props5.onCellsChanged,
          data = _props5.data;

      if (onCellsChanged) {
        onCellsChanged([{ cell: data[row][col], row: row, col: col, value: value }]);
      } else if (onChange) {
        onChange(data[row][col], row, col, value);
      }
      this.onRevert();
    }
  }, {
    key: 'onRevert',
    value: function onRevert() {
      this._setState({ editing: {} });
      this.dgDom && this.dgDom.focus({ preventScroll: true });
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps, prevState) {
      var _state = this.state,
          start = _state.start,
          end = _state.end;

      var prevEnd = prevState.end;
      if (!isEmpty(end) && !(end.i === prevEnd.i && end.j === prevEnd.j) && !this.isSelectionControlled()) {
        this.props.onSelect && this.props.onSelect({ start: start, end: end });
      }
    }
  }, {
    key: 'isSelected',
    value: function isSelected(i, j) {
      var _getState8 = this.getState(),
          start = _getState8.start,
          end = _getState8.end;

      var posX = j >= start.j && j <= end.j;
      var negX = j <= start.j && j >= end.j;
      var posY = i >= start.i && i <= end.i;
      var negY = i <= start.i && i >= end.i;

      return posX && posY || negX && posY || negX && negY || posX && negY;
    }
  }, {
    key: 'isEditing',
    value: function isEditing(i, j) {
      return this.state.editing.i === i && this.state.editing.j === j;
    }
  }, {
    key: 'isClearing',
    value: function isClearing(i, j) {
      return this.state.clear.i === i && this.state.clear.j === j;
    }
  }, {
    key: 'handleScroll',
    value: function handleScroll(e) {
      var scrollTop = e.currentTarget.scrollTop;
      var scrollLeft = e.currentTarget.scrollLeft;

      var virtualization = this.props.virtualization;

      if (virtualization && Array.isArray(virtualization.columnWidths)) {
        var totalWidth = virtualization.columnWidths.reduce(function (sum, width) {
          return sum + width;
        }, 0);
        var viewportWidth = virtualization.width;
        var maxScrollLeft = Math.max(0, totalWidth - viewportWidth);
        var clampedScrollLeft = Math.min(scrollLeft, maxScrollLeft);
        if (clampedScrollLeft !== scrollLeft) {
          requestAnimationFrame(function () {
            e.currentTarget.scrollLeft = clampedScrollLeft;
          });
          scrollLeft = clampedScrollLeft;
        }
      }
      this.setState({ scrollTop: scrollTop, scrollLeft: scrollLeft });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this4 = this;

      var _props6 = this.props,
          SheetRenderer = _props6.sheetRenderer,
          RowRenderer = _props6.rowRenderer,
          cellRenderer = _props6.cellRenderer,
          dataRenderer = _props6.dataRenderer,
          valueRenderer = _props6.valueRenderer,
          dataEditor = _props6.dataEditor,
          valueViewer = _props6.valueViewer,
          attributesRenderer = _props6.attributesRenderer,
          className = _props6.className,
          overflow = _props6.overflow,
          data = _props6.data,
          keyFn = _props6.keyFn,
          virtualization = _props6.virtualization;


      var virtualized = !!virtualization;

      var _ref6 = virtualization || {},
          height = _ref6.height,
          rowHeight = _ref6.rowHeight,
          rowOverscanCount = _ref6.rowOverscanCount,
          width = _ref6.width,
          columnWidths = _ref6.columnWidths,
          columnOverscanCount = _ref6.columnOverscanCount,
          pinnedRowCount = _ref6.pinnedRowCount,
          pinnedColumnCount = _ref6.pinnedColumnCount;

      if (virtualization) {
        if (rowHeight <= 0) {
          throw new Error('Invalid virtualization: rowHeight Must be greater than 0. Please provide a positive rowHeight.');
        }
        // Validate column virtualization inputs: columnWidths is now required when virtualization is provided
        if (!Array.isArray(columnWidths)) {
          throw new Error('Invalid virtualization: columnWidths is required and must be an array of non-negative numbers.');
        }
        var hasNegative = columnWidths.some(function (w) {
          return typeof w !== 'number' || w < 0 || Number.isNaN(w);
        });
        if (hasNegative) {
          throw new Error('Invalid virtualization: columnWidths must be an array of non-negative numbers.');
        }
      }

      var forceEdit = this.state.forceEdit;


      var totalCols = data[0] ? data[0].length : 0;
      var enableColVirtualization = virtualized && typeof width === 'number' && Array.isArray(columnWidths);
      var scrollLeft = this.state.scrollLeft || 0;
      var colOverscan = typeof columnOverscanCount === 'number' ? columnOverscanCount : rowOverscanCount;
      var startCol = 0;
      var endCol = totalCols - 1;
      var leftPad = 0;
      var rightPad = 0;
      var pinnedCols = 0;
      var colPrefix = null;
      if (enableColVirtualization) {
        var _computeColumnVirtual = computeColumnVirtualization({
          totalCols: totalCols,
          columnWidths: columnWidths,
          viewportWidth: width,
          scrollLeft: scrollLeft,
          rowOverscanCount: colOverscan,
          pinnedColumnCount: pinnedColumnCount
        }),
            start = _computeColumnVirtual.start,
            end = _computeColumnVirtual.end,
            lp = _computeColumnVirtual.leftPad,
            rp = _computeColumnVirtual.rightPad,
            pc = _computeColumnVirtual.pinnedCols,
            prefix = _computeColumnVirtual.prefix;

        startCol = start;
        endCol = end;
        leftPad = lp;
        rightPad = rp;
        pinnedCols = pc;
        colPrefix = prefix;
      }

      var pinnedRows = Math.min(Math.max(0, pinnedRowCount || 0), data.length);

      var renderRowContent = function renderRowContent(row, i) {
        var renderCell = function renderCell(cell, j) {
          var isEditing = _this4.isEditing(i, j);
          var cellWidth = enableColVirtualization ? columnWidths[j] : undefined;
          var isPinnedRow = pinnedRows > 0 && i < pinnedRows;
          var isPinnedCol = pinnedCols > 0 && j < pinnedCols;
          var style = cellWidth ? {
            width: cellWidth,
            minWidth: cellWidth,
            maxWidth: cellWidth
          } : {};
          if (isPinnedRow || isPinnedCol) {
            style.position = 'sticky';
            style.backgroundColor = '#fff';
            style.zIndex = isPinnedRow && isPinnedCol ? 3 : 2;
            if (isPinnedRow) style.top = i * rowHeight;
            if (isPinnedCol) style.left = colPrefix[j];
          }
          return _react2.default.createElement(_DataCell2.default, _extends({
            key: cell.key ? cell.key : i + '-' + j,
            row: i,
            col: j,
            cell: cell,
            forceEdit: false,
            onMouseDown: _this4.onMouseDown,
            onMouseOver: _this4.onMouseOver,
            onDoubleClick: _this4.onDoubleClick,
            onContextMenu: _this4.onContextMenu,
            onChange: _this4.onChange,
            onRevert: _this4.onRevert,
            onNavigate: _this4.handleKeyboardCellMovement,
            onKey: _this4.handleKey,
            selected: _this4.isSelected(i, j),
            editing: isEditing,
            clearing: _this4.isClearing(i, j),
            attributesRenderer: attributesRenderer,
            cellRenderer: cellRenderer,
            valueRenderer: valueRenderer,
            dataRenderer: dataRenderer,
            valueViewer: valueViewer,
            dataEditor: dataEditor,
            style: Object.keys(style).length ? style : undefined
          }, isEditing ? {
            forceEdit: forceEdit
          } : {}));
        };

        return _react2.default.createElement(
          RowRenderer,
          { key: keyFn ? keyFn(i) : i, row: i, cells: row },
          pinnedCols > 0 ? row.slice(0, pinnedCols).map(function (cell, j) {
            return renderCell(cell, j);
          }) : null,
          enableColVirtualization && leftPad > 0 ? _react2.default.createElement('td', {
            key: 'lpad-' + i,
            style: { width: leftPad, minWidth: leftPad, maxWidth: leftPad }
          }) : null,
          (enableColVirtualization ? endCol >= startCol ? row.slice(startCol, endCol + 1) : [] : row).map(function (cell, jRel) {
            var j = enableColVirtualization ? startCol + jRel : jRel;
            return renderCell(cell, j);
          }),
          enableColVirtualization && rightPad > 0 ? _react2.default.createElement('td', {
            key: 'rpad-' + i,
            style: { width: rightPad, minWidth: rightPad, maxWidth: rightPad }
          }) : null
        );
      };

      var renderRows = function renderRows() {
        if (virtualized && typeof height === 'number' && typeof rowHeight === 'number') {
          var total = data.length;
          var cols = data[0] ? data[0].length : 0;

          var _computeRowVirtualiza = computeRowVirtualization({
            totalRows: total,
            rowHeight: rowHeight,
            viewportHeight: height,
            scrollTop: _this4.state.scrollTop,
            rowOverscanCount: rowOverscanCount,
            pinnedRowCount: pinnedRowCount
          }),
              _start = _computeRowVirtualiza.start,
              _end = _computeRowVirtualiza.end,
              topPad = _computeRowVirtualiza.topPad,
              bottomPad = _computeRowVirtualiza.bottomPad,
              pr = _computeRowVirtualiza.pinnedRows;

          var items = [];
          for (var i = 0; i < pr; i++) {
            items.push(renderRowContent(data[i], i));
          }
          if (topPad > 0) {
            items.push(_react2.default.createElement(
              'tr',
              { key: 'top-pad', style: { height: topPad } },
              _react2.default.createElement('td', { colSpan: cols })
            ));
          }
          for (var _i = _start; _i <= _end; _i++) {
            items.push(renderRowContent(data[_i], _i));
          }
          if (bottomPad > 0) {
            items.push(_react2.default.createElement(
              'tr',
              { key: 'bottom-pad', style: { height: bottomPad } },
              _react2.default.createElement('td', { colSpan: cols })
            ));
          }
          return items;
        }
        return data.map(function (row, i) {
          return renderRowContent(row, i);
        });
      };

      var totalContentWidth = enableColVirtualization ? columnWidths.reduce(function (sum, width) {
        return sum + width;
      }, 0) : undefined;

      var tableContent = _react2.default.createElement(
        SheetRenderer,
        {
          data: data,
          className: ['data-grid', className, overflow].filter(function (a) {
            return a;
          }).join(' ')
        },
        renderRows()
      );

      return _react2.default.createElement(
        'span',
        {
          ref: function ref(r) {
            _this4.dgDom = r;
          },
          tabIndex: '0',
          className: 'data-grid-container',
          onKeyDown: this.handleKey
        },
        virtualized && (typeof height === 'number' || typeof width === 'number') ? _react2.default.createElement(
          'div',
          {
            style: {
              height: typeof height === 'number' ? height : 'auto',
              width: typeof width === 'number' ? width : '100%',
              overflowY: typeof height === 'number' ? 'auto' : 'hidden',
              overflowX: typeof width === 'number' ? 'auto' : 'hidden',
              position: 'relative'
            },
            onScroll: this.handleScroll
          },
          enableColVirtualization ? _react2.default.createElement(
            'span',
            null,
            _react2.default.createElement('div', {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: totalContentWidth,
                height: 1,
                pointerEvents: 'none',
                visibility: 'hidden'
              }
            }),
            _react2.default.createElement(
              'div',
              { style: { position: 'relative' } },
              tableContent
            )
          ) : tableContent
        ) : tableContent
      );
    }
  }]);

  return DataSheet;
}(_react.PureComponent);

exports.default = DataSheet;


DataSheet.propTypes = {
  data: _propTypes2.default.array.isRequired,
  className: _propTypes2.default.string,
  disablePageClick: _propTypes2.default.bool,
  overflow: _propTypes2.default.oneOf(['wrap', 'nowrap', 'clip']),
  onChange: _propTypes2.default.func,
  onCellsChanged: _propTypes2.default.func,
  onContextMenu: _propTypes2.default.func,
  onSelect: _propTypes2.default.func,
  isCellNavigable: _propTypes2.default.func,
  selected: _propTypes2.default.shape({
    start: _propTypes2.default.shape({
      i: _propTypes2.default.number,
      j: _propTypes2.default.number
    }),
    end: _propTypes2.default.shape({
      i: _propTypes2.default.number,
      j: _propTypes2.default.number
    })
  }),
  valueRenderer: _propTypes2.default.func.isRequired,
  dataRenderer: _propTypes2.default.func,
  sheetRenderer: _propTypes2.default.func.isRequired,
  rowRenderer: _propTypes2.default.func.isRequired,
  cellRenderer: _propTypes2.default.func.isRequired,
  valueViewer: _propTypes2.default.func,
  dataEditor: _propTypes2.default.func,
  parsePaste: _propTypes2.default.func,
  attributesRenderer: _propTypes2.default.func,
  keyFn: _propTypes2.default.func,
  handleCopy: _propTypes2.default.func,
  // Virtualization options
  virtualization: _propTypes2.default.shape({
    height: _propTypes2.default.number.isRequired,
    rowHeight: _propTypes2.default.number.isRequired,
    rowOverscanCount: _propTypes2.default.number.isRequired,
    width: _propTypes2.default.number.isRequired,
    columnWidths: _propTypes2.default.arrayOf(_propTypes2.default.number).isRequired,
    columnOverscanCount: _propTypes2.default.number.isRequired,
    pinnedRowCount: _propTypes2.default.number,
    pinnedColumnCount: _propTypes2.default.number
  })
};

DataSheet.defaultProps = {
  sheetRenderer: _Sheet2.default,
  rowRenderer: _Row2.default,
  cellRenderer: _Cell2.default,
  valueViewer: _ValueViewer2.default,
  dataEditor: _DataEditor2.default
};