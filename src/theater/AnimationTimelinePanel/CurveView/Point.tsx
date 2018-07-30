import React from 'react'
import * as css from './Point.css'
import Connector from './Connector'
import DraggableArea from '$theater/common/components/DraggableArea/DraggableArea'
import {PanelActiveModeChannel} from '$theater/workspace/components/Panel/Panel'
import {Subscriber} from 'react-broadcast'
import {
  MODES,
  ActiveMode,
} from '$theater/common/components/ActiveModeDetector/ActiveModeDetector'
import {
  PointHandles as IHandles,
  PointPosition,
  PointHandles,
  TColor,
} from '$theater/AnimationTimelinePanel/types'
import {
  removeGlobalPointDragRule,
  addGlobalPointDragRule,
} from '$theater/AnimationTimelinePanel/utils'
import {
  SelectedAreaChannel,
  SelectionMoveChannel,
} from '$theater/AnimationTimelinePanel/SelectionProvider/SelectionProvider'
import {
  TTransformedSelectedArea,
  TSelectionMove,
} from '$theater/AnimationTimelinePanel/SelectionProvider/types'
import {TPropName} from '$theater/AnimationTimelinePanel/VariablesContainer/VariablesPropProvider'
import {
  TShowPointValuesEditor,
  TShowPointContextMenu,
  TRemovePointFromSelection,
  TAddPointToSelection,
} from '$theater/AnimationTimelinePanel/CurveView/types'

interface IProps {
  propGetter: (propName: TPropName) => any
  color: TColor
  prevPointTime?: number
  prevPointValue?: number
  prevPointHandles?: IHandles
  prevPointConnected?: boolean
  nextPointTime?: number
  nextPointValue?: number
  pointTime: number
  pointValue: number
  pointHandles: IHandles
  pointConnected: boolean
  pointAbsoluteTime: number
  pointAbsoluteValue: number
  pointIndex: number
  removePoint: (pointIndex: number) => void
  addConnector: (pointIndex: number) => void
  changePointPositionBy: (pointIndex: number, change: PointPosition) => void
  changePointHandlesBy: (pointIndex: number, change: PointHandles) => void
  makeHandleHorizontal: (pointIndex: number, side: 'left' | 'right') => void
  showPointValuesEditor: TShowPointValuesEditor
  showContextMenu: TShowPointContextMenu
  addPointToSelection: TAddPointToSelection
  removePointFromSelection: TRemovePointFromSelection
}

interface IState {
  isMoving: boolean
  pointMove: [number, number]
  handlesMove: IHandles
}

export type TSVGSize = {width: number; height: number}

export const POINT_RECT_EDGE_SIZE = 16

const getSVGSize = (propGetter: IProps['propGetter']): TSVGSize => {
  const height = propGetter('boxHeight')
  const width = propGetter('svgWidth')
  return {width, height}
}

class Point extends React.PureComponent<IProps, IState> {
  isSelected: boolean
  isNextPointSelected: boolean
  isPrevPointSelected: boolean
  pointClickRect: SVGRectElement | null
  activeMode: ActiveMode
  svgSize: TSVGSize
  leftHandleNormalizers: {xNormalizer: number; yNormalizer: number}
  rightHandleNormalizers: {xNormalizer: number; yNormalizer: number}

  constructor(props: IProps) {
    super(props)

    this.state = {
      isMoving: false,
      pointMove: [0, 0],
      handlesMove: [0, 0, 0, 0],
    }
    this.svgSize = getSVGSize(props.propGetter)
  }

  private _setActiveMode = (activeMode: ActiveMode) => {
    this.activeMode = activeMode
    if (this.pointClickRect == null) return null
    if (activeMode === MODES.d) {
      this.pointClickRect.classList.add(css.highlightRedOnHover)
    } else {
      this.pointClickRect.classList.remove(css.highlightRedOnHover)
    }
    return null
  }

  _resetState() {
    this.setState(() => ({
      isMoving: false,
      pointMove: [0, 0],
      handlesMove: [0, 0, 0, 0],
    }))
  }

  pointClickHandler = (e: React.MouseEvent<SVGRectElement>) => {
    e.preventDefault()
    e.stopPropagation()
    switch (this.activeMode) {
      case MODES.c:
        this.props.addConnector(this.props.pointIndex)
        break
      case MODES.cmd:
        this.props.addConnector(this.props.pointIndex)
        break
      case MODES.d:
        this.props.removePoint(this.props.pointIndex)
        break
      default: {
        const {
          left,
          top,
          width,
          height,
        } = this.pointClickRect!.getBoundingClientRect()
        const params = {
          left: left + width / 2,
          top: top + height / 2,
          initialTime: this.props.pointAbsoluteTime,
          initialValue: this.props.pointAbsoluteValue,
          pointIndex: this.props.pointIndex,
        }
        this.props.showPointValuesEditor(params)
      }
    }
  }

  handleClickHandler = (
    e: React.MouseEvent<SVGRectElement>,
    side: 'left' | 'right',
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (this.activeMode === MODES.h) {
      return this.props.makeHandleHorizontal(this.props.pointIndex, side)
    }
  }

  pointDragStartHandler = () => {
    addGlobalPointDragRule()
    this.svgSize = getSVGSize(this.props.propGetter)
  }

  pointDragHandler = (dx: number, dy: number, e: MouseEvent) => {
    const {width, height} = this.svgSize
    let x = (dx / width) * 100
    let y = (dy / height) * 100
    if (e.altKey) y = this.state.pointMove[1]
    if (e.shiftKey) x = this.state.pointMove[0]

    const {pointTime, prevPointTime, nextPointTime} = this.props
    const limitLeft = prevPointTime == null ? 0 : prevPointTime
    const limitRight = nextPointTime == null ? 100 : nextPointTime

    const newT = pointTime + x
    if (newT >= limitRight) x = limitRight - pointTime - 100 / width
    if (newT <= limitLeft) x = limitLeft - pointTime + 100 / width

    this.setState(() => ({
      isMoving: true,
      pointMove: [x, y],
    }))
  }

  changePointPosition = (dragHappened: boolean) => {
    removeGlobalPointDragRule()
    if (!dragHappened) return
    const {pointMove} = this.state
    this.props.changePointPositionBy(this.props.pointIndex, {
      time: pointMove[0],
      value: pointMove[1],
    })
    // this._resetState()
  }

  leftHandleDragStartHandler = () => {
    addGlobalPointDragRule()
    const {width, height} = getSVGSize(this.props.propGetter)
    const {pointTime, pointValue, prevPointTime, prevPointValue} = this.props
    this.leftHandleNormalizers = {
      // @ts-ignore
      xNormalizer: (prevPointTime - pointTime) * width,
      // @ts-ignore
      yNormalizer: (prevPointValue - pointValue) * height,
    }
  }

  leftHandleDragHandler = (dx: number, dy: number) => {
    const {xNormalizer, yNormalizer} = this.leftHandleNormalizers
    this.setState(() => ({
      isMoving: true,
      handlesMove: [(dx / xNormalizer) * 100, (dy / yNormalizer) * 100, 0, 0],
    }))
  }

  rightHandleDragStartHandler = () => {
    addGlobalPointDragRule()
    const {width, height} = getSVGSize(this.props.propGetter)
    const {pointTime, pointValue, nextPointTime, nextPointValue} = this.props
    this.rightHandleNormalizers = {
      // @ts-ignore
      xNormalizer: (nextPointTime - pointTime) * width,
      // @ts-ignore
      yNormalizer: (nextPointValue - pointValue) * height,
    }
  }

  rightHandleDragHandler = (dx: number, dy: number) => {
    const {xNormalizer, yNormalizer} = this.rightHandleNormalizers
    this.setState(() => ({
      isMoving: true,
      handlesMove: [0, 0, (dx / xNormalizer) * 100, (dy / yNormalizer) * 100],
    }))
  }

  changePointHandles = () => {
    removeGlobalPointDragRule()
    const {handlesMove} = this.state
    this.props.changePointHandlesBy(this.props.pointIndex, handlesMove)
    this._resetState()
  }

  contextMenuHandler = (e: React.MouseEvent<SVGRectElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const {clientX, clientY} = e
    this.props.showContextMenu({
      left: clientX,
      top: clientY,
      pointIndex: this.props.pointIndex,
    })
  }

  _highlightAsSelected = (selectedArea: TTransformedSelectedArea) => {
    const boxIndex = this.props.propGetter('boxIndex')
    let shouldUpdateHighlightAsSelectedClass = false
    if (selectedArea[boxIndex] == null) {
      this.isNextPointSelected = false
      this.isPrevPointSelected = false
      if (this.isSelected) {
        this.isSelected = false
        shouldUpdateHighlightAsSelectedClass = true
      }
    } else {
      const {
        pointTime,
        pointValue,
        prevPointTime,
        prevPointValue,
        nextPointTime,
        nextPointValue,
      } = this.props
      const {left, top, right, bottom} = selectedArea[boxIndex]
      if (
        left <= pointTime &&
        pointTime <= right &&
        top <= pointValue &&
        pointValue <= bottom
      ) {
        if (!this.isSelected) {
          this.isSelected = true
          shouldUpdateHighlightAsSelectedClass = true
        }
      } else {
        if (this.isSelected) {
          this.isSelected = false
          shouldUpdateHighlightAsSelectedClass = true
        }
      }
      if (
        prevPointTime != null &&
        prevPointValue != null &&
        left <= prevPointTime &&
        prevPointTime <= right &&
        top <= prevPointValue &&
        prevPointValue <= bottom
      ) {
        this.isPrevPointSelected = true
      } else {
        this.isPrevPointSelected = false
      }
      if (
        nextPointTime != null &&
        nextPointValue != null &&
        left <= nextPointTime &&
        nextPointTime <= right &&
        top <= nextPointValue &&
        nextPointValue <= bottom
      ) {
        this.isNextPointSelected = true
      } else {
        this.isNextPointSelected = false
      }
    }
    if (shouldUpdateHighlightAsSelectedClass && this.pointClickRect != null) {
      if (this.isSelected) {
        this.pointClickRect.classList.add(css.highlightAsSelected)
        this.props.addPointToSelection(this.props.pointIndex, {
          time: this.props.pointTime,
          value: this.props.pointValue,
        })
      } else {
        this.pointClickRect.classList.remove(css.highlightAsSelected)
        this.props.removePointFromSelection(this.props.pointIndex)
      }
    }
    return null
  }

  _handleSelectionMove = ({x, y}: TSelectionMove) => {
    if (this.isSelected) {
      const {width, height} = getSVGSize(this.props.propGetter)
      return this._renderTransformedPoint([
        (x / width) * 100,
        (y / height) * 100,
      ])
    }
    return null
  }

  _renderTransformedPoint(pointMove: IState['pointMove']) {
    const {
      color,
      pointTime,
      pointValue,
      pointHandles,
      pointConnected,
      prevPointTime,
      prevPointValue,
      prevPointHandles,
      prevPointConnected,
      nextPointTime,
      nextPointValue,
    } = this.props
    const {handlesMove} = this.state

    const newTime = pointTime + pointMove[0]
    const newValue = pointValue + pointMove[1]
    const newHandles = pointHandles
      .slice(0, 2)
      .map((handle: number, index: number) => handle + handlesMove[index + 2])
      .concat(pointHandles.slice(2)) as IHandles

    // @ts-ignore
    const newPrevPointHandles =
      prevPointHandles != null &&
      (prevPointHandles.slice(0, 2).concat(
        // @ts-ignore
        prevPointHandles
          .slice(2)
          .map((handle: number, index: number) => handle + handlesMove[index]),
      ) as IHandles)

    const renderPrevPointConnector =
      prevPointConnected && prevPointTime != null && prevPointValue != null
    return [
      <g key="pointAndConnectors" fill={color.darkened} stroke={color.darkened}>
        {pointConnected &&
          nextPointValue != null &&
          nextPointTime != null && (
            <Connector
              leftPointTime={newTime}
              leftPointValue={newValue}
              rightPointTime={
                this.isNextPointSelected
                  ? nextPointTime + pointMove[0]
                  : nextPointTime
              }
              rightPointValue={
                this.isNextPointSelected
                  ? nextPointValue + pointMove[1]
                  : nextPointValue
              }
              handles={newHandles}
            />
          )}
        {renderPrevPointConnector && (
          <Connector
            leftPointTime={
              this.isPrevPointSelected
                ? prevPointTime! + pointMove[0]
                : prevPointTime!
            }
            leftPointValue={
              this.isPrevPointSelected
                ? prevPointValue! + pointMove[1]
                : prevPointValue!
            }
            rightPointTime={newTime}
            rightPointValue={newValue}
            // @ts-ignore
            handles={newPrevPointHandles}
          />
        )}
        <circle
          fill="#1C2226"
          strokeWidth={2}
          cx={`${newTime}%`}
          cy={`${newValue}%`}
          r={3.2}
        />
      </g>,
      ...(renderPrevPointConnector
        ? this.isPrevPointSelected
          ? [
              <circle
                key="prevPoint"
                fill="#1C2226"
                stroke={color.darkened}
                strokeWidth={2}
                cx={`${prevPointTime! + pointMove[0]}%`}
                cy={`${prevPointValue! + pointMove[1]}%`}
                r={3.2}
              />,
            ]
          : [
              <circle
                key="prevPoint"
                fill="#1C2226"
                strokeWidth={1.6}
                cx={`${prevPointTime}%`}
                cy={`${prevPointValue}%`}
                r={3.2}
              />,
            ]
        : []),
    ]
  }

  render() {
    const {
      color,
      pointTime,
      pointValue,
      pointHandles,
      pointConnected,
      prevPointTime,
      prevPointValue,
      prevPointHandles,
      prevPointConnected,
      nextPointTime,
      nextPointValue,
    } = this.props
    const handles = (prevPointHandles != null
      ? prevPointHandles.slice(2)
      : [0, 0]
    ).concat(pointHandles.slice(0, 2))
    const {isMoving, handlesMove} = this.state

    const renderLeftHandle =
      prevPointValue != null &&
      prevPointValue !== pointValue &&
      prevPointConnected
    const renderRightHandle =
      nextPointValue != null && nextPointValue !== pointValue && pointConnected

    const x = `${pointTime}%`
    const y = `${pointValue}%`
    const leftHandle = renderLeftHandle && [
      `${pointTime +
        // @ts-ignore
        (handles[0] + handlesMove[0]) * (prevPointTime - pointTime)}%`,
      `${pointValue +
        // @ts-ignore
        (handles[1] + handlesMove[1]) * (prevPointValue - pointValue)}%`,
    ]
    const rightHandle = renderRightHandle && [
      `${pointTime +
        // @ts-ignore
        (handles[2] + handlesMove[2]) * (nextPointTime - pointTime)}%`,
      `${pointValue +
        // @ts-ignore
        (handles[3] + handlesMove[3]) * (nextPointValue - pointValue)}%`,
    ]

    return (
      <>
        <Subscriber channel={PanelActiveModeChannel}>
          {this._setActiveMode}
        </Subscriber>
        <Subscriber channel={SelectedAreaChannel}>
          {this._highlightAsSelected}
        </Subscriber>
        <g>
          {isMoving && this._renderTransformedPoint(this.state.pointMove)}
          {renderLeftHandle && (
            <line
              x1={x}
              y1={y}
              // @ts-ignore
              x2={leftHandle[0]}
              // @ts-ignore
              y2={leftHandle[1]}
              fill={color.darkened}
              stroke={color.darkened}
            />
          )}
          {renderRightHandle && (
            <g>
              <line
                x1={x}
                y1={y}
                // @ts-ignore
                x2={rightHandle[0]}
                // @ts-ignore
                y2={rightHandle[1]}
                fill={color.darkened}
                stroke={color.darkened}
              />
            </g>
          )}
          <DraggableArea
            onDragStart={this.pointDragStartHandler}
            onDrag={this.pointDragHandler}
            onDragEnd={this.changePointPosition}
          >
            <g>
              <rect
                width={POINT_RECT_EDGE_SIZE}
                height={POINT_RECT_EDGE_SIZE}
                x={x}
                y={y}
                fill="transparent"
                stroke="transparent"
                transform={`translate(-8 -8)`}
                onContextMenu={this.contextMenuHandler}
                onClick={this.pointClickHandler}
                className={css.pointClickRect}
                ref={c => (this.pointClickRect = c)}
              />
              <circle cx={x} cy={y} r={6} className={css.pointGlow} />
              <circle
                strokeWidth="2"
                cx={x}
                cy={y}
                r={3.2}
                className={css.pointStroke}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                fill="#1C2226"
                stroke="transparent"
                cx={x}
                cy={y}
                r={2.4}
                className={css.pointCenter}
              />
            </g>
          </DraggableArea>
          {renderLeftHandle && (
            <DraggableArea
              onDragStart={this.leftHandleDragStartHandler}
              onDrag={this.leftHandleDragHandler}
              onDragEnd={this.changePointHandles}
            >
              <g>
                <rect
                  width="12"
                  height="12"
                  // @ts-ignore
                  x={leftHandle[0]}
                  // @ts-ignore
                  y={leftHandle[1]}
                  fill="transparent"
                  stroke="transparent"
                  transform={`translate(${handlesMove[0] - 6} ${handlesMove[1] -
                    6})`}
                  onClick={e => this.handleClickHandler(e, 'left')}
                  className={css.handleClickRect}
                />
                <circle
                  strokeWidth="1"
                  // @ts-ignore
                  cx={leftHandle[0]}
                  // @ts-ignore
                  cy={leftHandle[1]}
                  r={2}
                  className={css.handle}
                  stroke={color.darkened}
                  fill={color.darkened}
                />
              </g>
            </DraggableArea>
          )}
          {renderRightHandle && (
            <DraggableArea
              onDragStart={this.rightHandleDragStartHandler}
              onDrag={this.rightHandleDragHandler}
              onDragEnd={this.changePointHandles}
            >
              <g>
                <rect
                  width="12"
                  height="12"
                  // @ts-ignore
                  x={rightHandle[0]}
                  // @ts-ignore
                  y={rightHandle[1]}
                  fill="transparent"
                  stroke="transparent"
                  onClick={e => this.handleClickHandler(e, 'right')}
                  transform={`translate(${handlesMove[2] - 6} ${handlesMove[3] -
                    6})`}
                  className={css.handleClickRect}
                />
                <circle
                  strokeWidth="1"
                  // @ts-ignore
                  cx={rightHandle[0]}
                  // @ts-ignoree
                  cy={rightHandle[1]}
                  r={2}
                  className={css.handle}
                  stroke={color.darkened}
                  fill={color.darkened}
                />
              </g>
            </DraggableArea>
          )}
        </g>
        <Subscriber channel={SelectionMoveChannel}>
          {this._handleSelectionMove}
        </Subscriber>
      </>
    )
  }
}

export default Point
