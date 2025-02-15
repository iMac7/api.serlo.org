import { user } from './user'
import { license } from '../license'
import { Model } from '~/internals/graphql'
import {
  castToAlias,
  castToNonEmptyString,
  castToUuid,
  EntityRevisionType,
  EntityType,
} from '~/model/decoder'
import { Instance } from '~/types'

export const exerciseGroup: Model<'ExerciseGroup'> = {
  __typename: EntityType.ExerciseGroup,
  id: castToUuid(2217),
  trashed: false,
  instance: Instance.De,
  alias: castToAlias('/mathe/2217/2217'),
  date: '2014-03-01T20:45:56Z',
  currentRevisionId: castToUuid(2218),
  revisionIds: [2218].map(castToUuid),
  licenseId: license.id,
  taxonomyTermIds: [5].map(castToUuid),
  exerciseIds: [2219].map(castToUuid),
  canonicalSubjectId: castToUuid(5),
}

export const exerciseGroupRevision: Model<'ExerciseGroupRevision'> = {
  __typename: EntityRevisionType.ExerciseGroupRevision,
  id: castToUuid(2218),
  trashed: false,
  alias: castToAlias('/mathe/2218/2218'),
  date: '2014-09-15T15:28:35Z',
  authorId: user.id,
  repositoryId: exerciseGroup.id,
  cohesive: false,
  content: castToNonEmptyString('content'),
  changes: 'changes',
}
