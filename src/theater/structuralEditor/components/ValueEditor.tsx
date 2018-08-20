import PureComponentWithTheater from '$theater/handy/PureComponentWithTheater'
import React from 'react'
import connect from '$theater/handy/connect'
import get from 'lodash/get'
import editorsPerType from './editorsPerType/editorsPerType'
import {ITheaterStoreState} from '$theater/types'
import * as typeSystem from '$theater/typeSystem'

interface IOwnProps {
  path: string[]
  typeName?: string
  config?: Record<string, $FixMe>
}

interface IProps extends IOwnProps {
  typeName: string
}

type State = {}

// @todo use PropsAsPointer
class ValueEditor extends PureComponentWithTheater<IProps, State> {
  render() {
    const {typeName} = this.props
    const type = typeSystem.types[typeName]
    if (!type) {
      throw new Error(`Cannot find a type named '${typeName}'`)
    }
    const EditorComponent = editorsPerType[typeName]

    if (!EditorComponent) {
      throw new Error(`Type '${typeName}' doesn't have a structural editor yet`)
    }

    return <EditorComponent path={this.props.path} config={this.props.config} />
  }
}

export default connect((s: ITheaterStoreState, op: IOwnProps) => {
  if (op.hasOwnProperty('typeName')) {
    const {typeName} = op
    if (!typeName) {
      // @todo
      throw new Error(`typeName can only be a string and not empty`)
    }

    if ($env.NODE_ENV === 'development') {
      const value = get(s, op.path)
      if (!value || value.__descriptorType !== typeName) {
        throw new Error(
          `The value's __descriptorType doesn't match the required typeName`,
        )
      }
    }

    return {typeName}
  } else {
    const value = get(s, op.path)
    if (value == undefined) {
      throw new Error(`Path doesn't exist`)
    }

    return {
      typeName: value.__descriptorType,
    }
  }
})(ValueEditor)
