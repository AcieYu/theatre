// @flow
import type {IDerivation} from '../types'
import type {default as Tappable} from '$shared/DataVerse/utils/Tappable'

export type ChangeType<O: {}> = {
  addedKeys: Array<$Keys<O>>,
  deletedKeys: Array<$Keys<O>>,
}

export interface IDerivedMap<O: {}> {
  prop<K: $Keys<O>>(K): IDerivation<$FixMe>,
  changes(): Tappable<ChangeType<O>>,
  keys(): Array<$Keys<O>>,
}