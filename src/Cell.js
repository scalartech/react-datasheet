import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import CellShape from './CellShape';

export default class Cell extends PureComponent {
  render() {
    const {
      cell,
      row,
      col,
      attributesRenderer,
      className,
      style,
      onMouseDown,
      onMouseOver,
      onDoubleClick,
      onContextMenu,
    } = this.props;

    const { colSpan, rowSpan } = cell;
    const attributes = attributesRenderer
      ? attributesRenderer(cell, row, col)
      : {};

    const Tag = this.props.virtualized ? 'div' : 'td';
    const extra = Tag === 'td' ? { colSpan, rowSpan } : {};
    return (
      <Tag
        className={className}
        onMouseDown={onMouseDown}
        onMouseOver={onMouseOver}
        onDoubleClick={onDoubleClick}
        onTouchEnd={onDoubleClick}
        onContextMenu={onContextMenu}
        style={style}
        {...extra}
        {...attributes}
      >
        {this.props.children}
      </Tag>
    );
  }
}

Cell.propTypes = {
  row: PropTypes.number.isRequired,
  col: PropTypes.number.isRequired,
  cell: PropTypes.shape(CellShape).isRequired,
  selected: PropTypes.bool,
  editing: PropTypes.bool,
  updated: PropTypes.bool,
  attributesRenderer: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onMouseOver: PropTypes.func.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
  virtualized: PropTypes.bool,
};

Cell.defaultProps = {
  selected: false,
  editing: false,
  updated: false,
  attributesRenderer: () => {},
};
