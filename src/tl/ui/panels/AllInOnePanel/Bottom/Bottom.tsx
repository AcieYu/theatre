import resolveCss from '$shared/utils/resolveCss'
import UIComponent from '$tl/ui/handy/UIComponent'
import React from 'react'
import * as css from './Bottom.css'
import ProjectSelect from './ProjectSelect'
import Item from './Item'
import TimelineSelect from './TimelineSelect'
import TimelineInstanceSelect from './TimelineInstanceSelect'
import Settings from '$tl/ui/panels/AllInOnePanel/Bottom/Settings/Settings'
import DraggableArea from '$theater/common/components/DraggableArea/DraggableArea'

export const bottomHeight = parseFloat(css.bottomHeight.replace(/[a-z]+$/, ''))

const classes = resolveCss(css)

interface IProps {
  handlePanelMove: (dx: number, dy: number) => void
  handlePanelMoveEnd: (moveHappened: boolean) => void
}

interface IState {}

export default class Bottom extends UIComponent<IProps, IState> {
  constructor(props: IProps, context: $IntentionalAny) {
    super(props, context)
    this.state = {}
  }

  render() {
    return (
      <div {...classes('container')}>
        <div className={css.leftContainer}>
          <ProjectSelect />
          <TimelineSelect />
          <TimelineInstanceSelect />
        </div>
        <DraggableArea
          shouldReturnMovement
          onDrag={this.props.handlePanelMove}
          onDragEnd={this.props.handlePanelMoveEnd}
        >
          <div {...classes('moveHandle')} />
        </DraggableArea>
        <div className={css.rightContainer}>
          <Settings />
          <Item>TheaterJS</Item>
        </div>
      </div>
    )
  }
}
