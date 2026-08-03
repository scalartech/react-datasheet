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
    const { style: attributeStyle, ...restAttributes } = attributes || {};

    // attributesRenderer style can replace the style prop when spread after it;
    // keep sticky pin offsets from the datasheet style so pinned cells stay pinned.
    const composedStyle = {
      ...(style || {}),
      ...(attributeStyle || {}),
      ...(style && style.position === 'sticky'
        ? {
            position: style.position,
            ...(style.top != null ? { top: style.top } : {}),
            ...(style.left != null ? { left: style.left } : {}),
          }
        : {}),
    };

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
        style={Object.keys(composedStyle).length ? composedStyle : undefined}
        {...extra}
        {...restAttributes}
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
