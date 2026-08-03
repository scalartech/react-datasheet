import React from 'react';
import { shallow } from 'enzyme';
import expect from 'expect';
import DataSheet from '../src/DataSheet';
import Cell from '../src/Cell';

const grid = [
  [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
  [{ value: 'd' }, { value: 'e' }, { value: 'f' }],
  [{ value: 'g' }, { value: 'h' }, { value: 'i' }],
];

const baseVirtualization = {
  height: 100,
  rowHeight: 20,
  rowOverscanCount: 0,
  width: 200,
  columnWidths: [80, 80, 80],
  columnOverscanCount: 0,
};

describe('virtualization pinning', () => {
  it('applies sticky styles for normal pinned counts', () => {
    const wrapper = shallow(
      <DataSheet
        data={grid}
        valueRenderer={cell => cell.value}
        virtualization={{
          ...baseVirtualization,
          pinnedRowCount: 1,
          pinnedColumnCount: 1,
        }}
      />,
    );
    const corner = wrapper
      .find('DataCell')
      .filterWhere(n => n.prop('row') === 0 && n.prop('col') === 0)
      .first();
    expect(corner.prop('style').position).toBe('sticky');
    expect(corner.prop('style').top).toBe(0);
    expect(corner.prop('style').left).toBe(0);
    expect(corner.prop('style').zIndex).toBe(3);
  });

  it('rejects fractional or negative pinned counts instead of breaking the grid', () => {
    expect(() =>
      shallow(
        <DataSheet
          data={grid}
          valueRenderer={cell => cell.value}
          virtualization={{
            ...baseVirtualization,
            pinnedRowCount: 1.5,
          }}
        />,
      ),
    ).toThrow(
      /Invalid virtualization: pinnedRowCount must be a finite non-negative integer/,
    );

    expect(() =>
      shallow(
        <DataSheet
          data={grid}
          valueRenderer={cell => cell.value}
          virtualization={{
            ...baseVirtualization,
            pinnedColumnCount: -1,
          }}
        />,
      ),
    ).toThrow(
      /Invalid virtualization: pinnedColumnCount must be a finite non-negative integer/,
    );
  });

  it('keeps sticky position/top/left when attributesRenderer returns style', () => {
    const wrapper = shallow(
      <Cell
        row={0}
        col={0}
        cell={{ value: 'a' }}
        onMouseDown={() => {}}
        onMouseOver={() => {}}
        onDoubleClick={() => {}}
        onContextMenu={() => {}}
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          zIndex: 3,
        }}
        attributesRenderer={() => ({
          style: {
            backgroundColor: 'red',
            position: 'static',
            top: 99,
            left: 99,
          },
          'data-test': 'pinned',
        })}
      />,
    );
    const style = wrapper.find('td').prop('style');
    expect(style.position).toBe('sticky');
    expect(style.top).toBe(0);
    expect(style.left).toBe(0);
    expect(style.backgroundColor).toBe('red');
    expect(wrapper.find('td').prop('data-test')).toBe('pinned');
  });
});
