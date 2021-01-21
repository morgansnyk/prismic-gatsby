import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import { Dependencies, TypePathNode } from '../types'

import { dotPath } from './dotPath'

export const getTypePath = (
  path: string[],
): RTE.ReaderTaskEither<Dependencies, Error, TypePathNode> =>
  pipe(
    RTE.ask<Dependencies>(),
    RTE.chain((deps) =>
      RTE.fromIO(() => deps.getNode(path.toString()) as TypePathNode),
    ),
    RTE.chainW(
      RTE.fromPredicate(
        (result) => result != null,
        () =>
          new Error(`Could not find a type path for path: "${dotPath(path)}"`),
      ),
    ),
  )